import { Hono } from "hono";
import { chatRoutes } from "./routes/chat";
import { healthRoutes } from "./routes/health";
import { sessionRoutes } from "./routes/sessions";

const app = new Hono()
  .route("/chat", chatRoutes)
  .route("/health", healthRoutes)
  .route("/sessions", sessionRoutes);

export type AppType = typeof app;

export default app;
