import { z } from "zod";

/** The `:sessionId` path parameter of every session-scoped route. */
export const sessionParamSchema = z.object({ sessionId: z.uuid() });
