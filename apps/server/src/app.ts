import { Hono } from "hono";
import { chatRoutes } from "./routes/chat";
import { healthRoutes } from "./routes/health";

const app = new Hono()
  .route("/chat", chatRoutes)
  .route("/health", healthRoutes);

export type AppType = typeof app;

export default app;
