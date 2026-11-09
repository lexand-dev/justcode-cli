import { createDeepSeek } from "@ai-sdk/deepseek";
import { zValidator } from "@hono/zod-validator";
import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStreamResponse,
  isStepCount,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream
} from "ai";
import { Hono } from "hono";
import { z } from "zod";
import { isMessageInOtherSession, loadChat, saveChat } from "../chat-store";
import { chatTools, type ChatUIMessage } from "../chat-tools";
import { sessionParamSchema } from "./sessions";

const deepSeek = createDeepSeek({ baseURL: "https://api.deepseek.com/beta" });
const MODEL_ID = "deepseek-v4-flash";

// The CLI sends only its new message; the history is loaded from the database.
const chatRequestSchema = z.object({
  message: z.object({
    id: z.string().min(1),
    role: z.literal("user"),
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

    // A retry resends a message that is already stored: replace it and drop anything after it.
    const storedIndex = stored.messages.findIndex((storedMessage) => storedMessage.id === message.id);
    if (storedIndex === -1 && await isMessageInOtherSession(message.id, sessionId)) {
      return c.text("Message id belongs to another session.", 409);
    }
    const history = storedIndex === -1 ? stored.messages : stored.messages.slice(0, storedIndex);

    const validated = await safeValidateUIMessages<ChatUIMessage>({
      messages: [...history, message],
      tools: chatTools
    });
    if (!validated.success) {
      return c.text("Invalid message.", 400);
    }

    const result = streamText({
      model: deepSeek(MODEL_ID),
      messages: await convertToModelMessages(validated.data),
      instructions: "When asked to add two numbers, call addNumbers and include its result in your answer.",
      tools: chatTools,
      stopWhen: isStepCount(2)
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        originalMessages: validated.data,
        // Server-generated assistant ids, so the stored id matches the one the client receives.
        generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
        onEnd: async ({ messages: finalMessages, outcome }) => {
          // Errors are not persisted: if the reply did not complete, store the conversation
          // without it. On retry the client resends the same user message.
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
