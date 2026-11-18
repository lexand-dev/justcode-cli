import type { InferUITools, UIDataTypes, UIMessage } from "ai";
import { agentModeTools, type AgentMode } from "./modes";
import { editFileTool } from "./tools/filesystem/edit-file";
import { listFilesTool } from "./tools/filesystem/list-files";
import { readFileTool } from "./tools/filesystem/read-file";
import { searchFilesTool } from "./tools/filesystem/search-files";
import { writeFileTool } from "./tools/filesystem/write-file";
import { bashTool } from "./tools/shell/bash";

export {
  AGENT_MODES,
  type AgentMode,
  agentModeSchema,
  agentModeTools,
  DEFAULT_AGENT_MODE,
  nextAgentMode
} from "./modes";

/** Every agent tool's name. The names are the source of truth: `agentTools` must have exactly these keys. */
export const AGENT_TOOL_NAMES = [
  "readFile",
  "writeFile",
  "editFile",
  "listFiles",
  "searchFiles",
  "bash",
] as const;

export type AgentToolName = (typeof AGENT_TOOL_NAMES)[number];

/**
 * The coding agent's tools, as sent to the model. They have no `execute`: the server only
 * forwards tool calls, and the CLI runs them against its working directory (see `./execute`).
 * To add a tool, add its name to `AGENT_TOOL_NAMES`, create it under `tools/<group>/`, register
 * its definition here and its module in `execute.ts`. Missing or extra keys fail to typecheck.
 */
export const agentTools = {
  readFile: readFileTool,
  writeFile: writeFileTool,
  editFile: editFileTool,
  listFiles: listFilesTool,
  searchFiles: searchFilesTool,
  bash: bashTool
} satisfies Record<AgentToolName, unknown>;

export type AgentTools = typeof agentTools;

export type ChatUIMessage = UIMessage<unknown, UIDataTypes, InferUITools<AgentTools>>;

/** The tools a mode lets the model call: its `agentModeTools` entry, or every tool when it has none. */
export function activeToolsFor(mode: AgentMode): AgentToolName[] {
  return agentModeTools[mode] ?? [...AGENT_TOOL_NAMES];
}
