import { Hono } from "hono";
import { chatRoutes } from "./chat/routes";
import { healthRoutes } from "./health/routes";
import { sessionRoutes } from "./sessions/routes";

const app = new Hono()
  .route("/chat", chatRoutes)
  .route("/health", healthRoutes)
  .route("/sessions", sessionRoutes);

export type AppType = typeof app;

export default app;
