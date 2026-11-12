import { createDeepSeek } from "@ai-sdk/deepseek";
import { agentTools } from "@justcode/tools";
import { ToolLoopAgent } from "ai";
import { INSTRUCTIONS } from "./instructions";

const deepSeek = createDeepSeek({ baseURL: "https://api.deepseek.com/beta" });

/** The model behind the agent; recorded on each stored assistant message. */
export const MODEL_ID = "deepseek-v4-flash";

/** Whether the provider's API key is set, so the agent can run. */
export function isAgentConfigured() {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

/**
 * The coding agent. Its tools have no `execute`, so the loop ends at the first tool call:
 * each run is one step, and the CLI runs the call and sends the outputs back in a new request.
 */
export const codingAgent = new ToolLoopAgent({
  model: deepSeek(MODEL_ID),
  instructions: INSTRUCTIONS,
  tools: agentTools
});
