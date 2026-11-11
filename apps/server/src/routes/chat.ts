import { createDeepSeek } from "@ai-sdk/deepseek";
import { zValidator } from "@hono/zod-validator";
import { agentTools, type ChatUIMessage } from "@justcode/tools";
import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStreamResponse,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream
} from "ai";
import { Hono } from "hono";
import { z } from "zod";
import { isMessageInOtherSession, loadChat, saveChat } from "../chat-store";
import { sessionParamSchema } from "./sessions";

const deepSeek = createDeepSeek({ baseURL: "https://api.deepseek.com/beta" });
const MODEL_ID = "deepseek-v4-flash";

const INSTRUCTIONS = `You are JustCode, a coding agent working in the user's project directory.
- Use the tools to inspect and change files. All paths are relative to the project root; you cannot access anything outside it.
- Explore with listFiles and searchFiles before assuming how the project is laid out.
- Read a file before editing it. Prefer editFile for targeted changes; use writeFile for new files or full rewrites.
- Use bash to run builds, tests, type checks, git, and package managers, and to verify your changes. Use the file tools, not bash, to read, search, or edit files. The user approves every command; if they deny one, do not retry it: ask how they want to proceed.
- If a tool returns an error, read it and adjust instead of repeating the same call.
- Keep answers short and concrete. Summarize what you changed when you are done.`;

// The CLI sends only its newest message; the history is loaded from the database.
// A `user` message starts (or retries) a turn. An `assistant` message continues the latest
// stored assistant message after the CLI has run its tool calls and filled in the outputs.
const chatRequestSchema = z.object({
  message: z.object({
    id: z.string().min(1),
    role: z.enum(["user", "assistant"]),
    parts: z.array(z.unknown()).min(1)
  }).passthrough()
});

export const chatRoutes = new Hono()
  .post("/:sessionId", zValidator("param", sessionParamSchema), zValidator("json", chatRequestSchema), async (c) => {
    if (!process.env.DEEPSEEK_API_KEY) {
      return c.text("Set DEEPSEEK_API_KEY to use this route.", 500);
    }

    const { sessionId } = c.req.valid("param");
    const { message } = c.req.valid("json");

    const stored = await loadChat(sessionId);
    if (stored.status === "not-found") return c.text("Session not found.", 404);
    if (stored.status === "invalid") return c.text("Stored messages are invalid.", 500);

    // A resent message that is already stored replaces it, and anything after it is dropped.
    const storedIndex = stored.messages.findIndex((storedMessage) => storedMessage.id === message.id);
    if (storedIndex === -1 && await isMessageInOtherSession(message.id, sessionId)) {
      return c.text("Message id belongs to another session.", 409);
    }
    if (storedIndex !== -1 && stored.messages[storedIndex]?.role !== message.role) {
      return c.text("Message role does not match the stored message.", 400);
    }
    if (message.role === "assistant" && (storedIndex === -1 || storedIndex !== stored.messages.length - 1)) {
      return c.text("Only the latest assistant message can be continued.", 400);
    }
    const history = storedIndex === -1 ? stored.messages : stored.messages.slice(0, storedIndex);

    const validated = await safeValidateUIMessages<ChatUIMessage>({
      messages: [...history, message],
      tools: agentTools
    });
    if (!validated.success) {
      return c.text("Invalid message.", 400);
    }

    // The tools have no `execute`: each tool call ends this stream, the CLI runs it in its
    // working directory and sends the assistant message back with the outputs.
    const result = streamText({
      model: deepSeek(MODEL_ID),
      // Tool calls the CLI never answered (e.g. it quit mid-turn) are skipped instead of failing.
      messages: await convertToModelMessages(validated.data, { ignoreIncompleteToolCalls: true }),
      instructions: INSTRUCTIONS,
      tools: agentTools
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
            await saveChat({ sessionId, messages: toSave, model: MODEL_ID });
          } catch (error) {
            console.error(`Failed to save chat session ${sessionId}:`, error);
          }
        }
      })
    });
  });
