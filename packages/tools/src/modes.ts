import { z } from "zod";
import type { AgentToolName } from "./index";

/** Every agent mode, in the order Tab cycles through them. The first is the default. */
export const AGENT_MODES = ["build", "plan"] as const;

export type AgentMode = (typeof AGENT_MODES)[number];

export const DEFAULT_AGENT_MODE: AgentMode = AGENT_MODES[0];

export const agentModeSchema = z.enum(AGENT_MODES);

/**
 * The tools each mode can call; `undefined` means every tool. The server passes them as
 * `activeTools`, so the model neither sees nor can call the others. Read-only modes list their
 * tools explicitly, so a tool added later stays out of them until it is added here.
 */
export const agentModeTools: { [MODE in AgentMode]: AgentToolName[] | undefined } = {
  build: undefined,
  plan: ["readFile", "listFiles", "searchFiles"]
};

/** The mode after `mode`, wrapping around to the first. */
export function nextAgentMode(mode: AgentMode): AgentMode {
  return AGENT_MODES[(AGENT_MODES.indexOf(mode) + 1) % AGENT_MODES.length] ?? DEFAULT_AGENT_MODE;
}
