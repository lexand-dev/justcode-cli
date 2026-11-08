import { tool, type InferUITools, type UIDataTypes, type UIMessage } from "ai";
import { z } from "zod";

export const chatTools = {
  addNumbers: tool({
    description: "Add two numbers for a quick tool-call test.",
    inputSchema: z.object({ a: z.number(), b: z.number() }),
    strict: true,
    execute: async ({ a, b }) => ({ sum: a + b })
  })
};

export type ChatUIMessage = UIMessage<unknown, UIDataTypes, InferUITools<typeof chatTools>>;
