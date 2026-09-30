import { deepSeek } from "@ai-sdk/deepseek";
import { zValidator } from "@hono/zod-validator";
import { APP_NAME } from "@justcode/shared";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream
} from "ai";
import { Hono } from "hono";
import { z } from "zod";

const generateRequestSchema = z.object({
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(["system", "user", "assistant"]),
    parts: z.array(z.unknown()).min(1)
  }).passthrough()).min(1)
});

const app = new Hono()
  .get("/", (c) => c.json({ message: `Welcome to ${APP_NAME}!` }))
  .get("/health", (c) => c.json({ status: "ok" }))
  .post("/generate", zValidator("json", generateRequestSchema), async (c) => {
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
      messages: await convertToModelMessages(validated.data)
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream })
    });
  });

export type AppType = typeof app;

export default app;
