import { createDeepSeek } from "@ai-sdk/deepseek";
import { activeToolsFor, agentModeSchema, agentTools } from "@justcode/tools";
import { ToolLoopAgent } from "ai";
import { z } from "zod";
import { env } from "../env";
import { instructionsFor } from "./instructions";

const deepSeek = createDeepSeek({ baseURL: "https://api.deepseek.com/beta" });

/** The model behind the agent; recorded on each stored assistant message. */
export const MODEL_ID = "deepseek-v4-flash";

/** Whether the provider's API key is set, so the agent can run. */
export function isAgentConfigured() {
  return env.DEEPSEEK_API_KEY !== undefined;
}

/**
 * The coding agent. Its tools have no `execute`, so the loop ends at the first tool call:
 * each run is one step, and the CLI runs the call and sends the outputs back in a new request.
 * Each call passes the active mode, which sets the instructions and the tools the model can call.
 */
export const codingAgent = new ToolLoopAgent({
  model: deepSeek(MODEL_ID),
  tools: agentTools,
  callOptionsSchema: z.object({ mode: agentModeSchema }),
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    instructions: instructionsFor(options.mode),
    activeTools: activeToolsFor(options.mode)
  })
});
