import type { InferUITools, UIDataTypes, UIMessage } from "ai";
import { editFileTool } from "./tools/filesystem/edit-file";
import { listFilesTool } from "./tools/filesystem/list-files";
import { readFileTool } from "./tools/filesystem/read-file";
import { searchFilesTool } from "./tools/filesystem/search-files";
import { writeFileTool } from "./tools/filesystem/write-file";
import { bashTool } from "./tools/shell/bash";

/**
 * The coding agent's tools, as sent to the model. They have no `execute`: the server only
 * forwards tool calls, and the CLI runs them against its working directory (see `./execute`).
 * To add a tool, create it under `tools/<group>/`, register its definition here and its
 * module in `execute.ts`.
 */
export const agentTools = {
  readFile: readFileTool,
  writeFile: writeFileTool,
  editFile: editFileTool,
  listFiles: listFilesTool,
  searchFiles: searchFilesTool,
  bash: bashTool
};

export type AgentTools = typeof agentTools;
export type AgentToolName = keyof AgentTools;

export type ChatUIMessage = UIMessage<unknown, UIDataTypes, InferUITools<AgentTools>>;
