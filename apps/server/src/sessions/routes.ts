import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { sessionParamSchema } from "./params";
import { storedSessionError } from "./responses";
import { createSession, loadSessionMessages } from "./store";

export const sessionRoutes = new Hono()
  .post("/", async (c) => {
    const id = await createSession();
    return c.json({ id }, 201);
  })
  .get("/:sessionId/messages", zValidator("param", sessionParamSchema), async (c) => {
    const { sessionId } = c.req.valid("param");
    const stored = await loadSessionMessages(sessionId);
    if (stored.status !== "ok") return storedSessionError(c, stored);
    return c.json({ messages: stored.messages }, 200);
  });
