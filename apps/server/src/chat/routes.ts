import { zValidator } from "@hono/zod-validator";
import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStreamResponse,
  toUIMessageStream
} from "ai";
import { Hono } from "hono";
import { z } from "zod";
import { codingAgent, isAgentConfigured, MODEL_ID } from "../agent/coding-agent";
import { sessionParamSchema } from "../sessions/params";
import { storedSessionError } from "../sessions/responses";
import { isMessageInOtherSession, loadSessionMessages, saveSessionMessages, validateMessages } from "../sessions/store";
import { resolveTurn } from "./turn";

// The CLI sends only its newest message; the history is loaded from the database.
// `resolveTurn` (./turn.ts) holds the rules for user messages, retries and continuations.
const chatRequestSchema = z.object({
  message: z.object({
    id: z.string().min(1),
    role: z.enum(["user", "assistant"]),
    parts: z.array(z.unknown()).min(1)
  }).passthrough()
});

export const chatRoutes = new Hono()
  .post("/:sessionId", zValidator("param", sessionParamSchema), zValidator("json", chatRequestSchema), async (c) => {
    if (!isAgentConfigured()) {
      return c.text("Set DEEPSEEK_API_KEY to use this route.", 500);
    }

    const { sessionId } = c.req.valid("param");
    const { message } = c.req.valid("json");

    const stored = await loadSessionMessages(sessionId);
    if (stored.status !== "ok") return storedSessionError(c, stored);

    const turn = await resolveTurn({
      stored: stored.messages,
      message,
      isInOtherSession: () => isMessageInOtherSession(message.id, sessionId)
    });
    if (turn.status === "other-session") return c.text("Message id belongs to another session.", 409);
    if (turn.status === "role-mismatch") return c.text("Message role does not match the stored message.", 400);
    if (turn.status === "not-latest-assistant") {
      return c.text("Only the latest assistant message can be continued.", 400);
    }

    const validated = await validateMessages([...turn.history, message]);
    if (!validated.success) {
      return c.text("Invalid message.", 400);
    }

    // The tools have no `execute`: each tool call ends this stream, the CLI runs it in its
    // working directory and sends the assistant message back with the outputs.
    // Not `createAgentUIStreamResponse`: it converts messages without `ignoreIncompleteToolCalls`.
    const result = await codingAgent.stream({
      // Tool calls the CLI never answered (e.g. it quit mid-turn) are skipped instead of failing.
      messages: await convertToModelMessages(validated.data, { ignoreIncompleteToolCalls: true })
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        originalMessages: validated.data,
        // Server-generated assistant ids, so the stored id matches the one the client receives.
        // A continuation reuses the id of the incoming assistant message.
        generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
        onEnd: async ({ messages: finalMessages, outcome }) => {
          // Errors are not persisted: if the reply did not complete, store the conversation
          // without it. On retry the client resends the same message.
          const toSave = outcome.status === "completed" ? finalMessages : validated.data;
          try {
            await saveSessionMessages({ sessionId, messages: toSave, model: MODEL_ID });
          } catch (error) {
            console.error(`Failed to save chat session ${sessionId}:`, error);
          }
        }
      })
    });
  });
