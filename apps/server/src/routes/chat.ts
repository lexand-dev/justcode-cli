import { createDeepSeek } from "@ai-sdk/deepseek";
import { zValidator } from "@hono/zod-validator";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  safeValidateUIMessages,
  streamText,
  tool,
  toUIMessageStream
} from "ai";
import { Hono } from "hono";
import { z } from "zod";

const deepSeek = createDeepSeek({ baseURL: "https://api.deepseek.com/beta" });

const chatRequestSchema = z.object({
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(["system", "user", "assistant"]),
    parts: z.array(z.unknown()).min(1)
  }).passthrough()).min(1).refine((messages) => messages.at(-1)?.role === "user")
});

export const chatRoutes = new Hono()
  .post("/", zValidator("json", chatRequestSchema), async (c) => {
    if (!process.env.DEEPSEEK_API_KEY) {
      return c.text("Set DEEPSEEK_API_KEY to use this route.", 500);
    }

    const { messages } = c.req.valid("json");
    const validated = await safeValidateUIMessages({ messages });
    if (!validated.success) {
      return c.text("Invalid messages.", 400);
    }

    const result = streamText({
      model: deepSeek("deepseek-v4-flash"),
      messages: await convertToModelMessages(validated.data),
      instructions: "When asked to add two numbers, call addNumbers and include its result in your answer.",
      tools: {
        addNumbers: tool({
          description: "Add two numbers for a quick tool-call test.",
          inputSchema: z.object({ a: z.number(), b: z.number() }),
          strict: true,
          execute: async ({ a, b }) => ({ sum: a + b })
        })
      },
      stopWhen: isStepCount(2)
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream })
    });
  });
