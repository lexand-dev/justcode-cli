import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { createSession, loadChat } from "../chat-store";

export const sessionParamSchema = z.object({ sessionId: z.uuid() });

export const sessionRoutes = new Hono()
  .post("/", async (c) => {
    const id = await createSession();
    return c.json({ id }, 201);
  })
  .get("/:sessionId/messages", zValidator("param", sessionParamSchema), async (c) => {
    const { sessionId } = c.req.valid("param");
    const chat = await loadChat(sessionId);
    if (chat.status === "not-found") return c.text("Session not found.", 404);
    if (chat.status === "invalid") return c.text("Stored messages are invalid.", 500);
    return c.json({ messages: chat.messages }, 200);
  });
