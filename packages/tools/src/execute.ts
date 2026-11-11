import type { InferToolInput, InferToolOutput } from "ai";
import { z } from "zod";
import type { ToolContext } from "./core/tool-context";
import type { AgentToolName, AgentTools } from "./index";
import { editFile } from "./tools/filesystem/edit-file";
import { listFiles } from "./tools/filesystem/list-files";
import { readFile } from "./tools/filesystem/read-file";
import { searchFiles } from "./tools/filesystem/search-files";
import { writeFile } from "./tools/filesystem/write-file";
import { bash } from "./tools/shell/bash";

export type { ToolContext } from "./core/tool-context";
export { createWorkspace, type Workspace } from "./core/workspace";

export type AgentToolInput<NAME extends AgentToolName> = InferToolInput<AgentTools[NAME]>;
export type AgentToolOutput<NAME extends AgentToolName> = InferToolOutput<AgentTools[NAME]>;

type ToolModule<NAME extends AgentToolName> = {
  inputSchema: z.ZodType<AgentToolInput<NAME>>;
  execute: (input: AgentToolInput<NAME>, context: ToolContext) => Promise<AgentToolOutput<NAME>>;
  /** The CLI asks the user before running the tool (it can act outside the workspace guardrail). */
  needsApproval?: boolean;
};

// Every tool in `agentTools` must have a module here, or this object fails to typecheck.
const toolModules: { [NAME in AgentToolName]: ToolModule<NAME> } = {
  readFile,
  writeFile,
  editFile,
  listFiles,
  searchFiles,
  bash
};

/** Whether the user must approve a call to this tool before it runs. */
export function toolNeedsApproval(name: AgentToolName): boolean {
  return toolModules[name].needsApproval === true;
}

/**
 * Validates a tool call's input, which comes from the network. Throws an `Error` whose
 * message is meant for the model.
 */
export function parseToolInput<NAME extends AgentToolName>(name: NAME, input: unknown): AgentToolInput<NAME> {
  const toolModule: ToolModule<NAME> = toolModules[name];
  const parsed = toolModule.inputSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Invalid input for ${name}:\n${z.prettifyError(parsed.error)}`);
  return parsed.data;
}

/**
 * Runs a tool call locally, validating its input first. Does not ask for approval: check
 * `toolNeedsApproval` before calling it. Throws an `Error` whose message is meant for the model.
 */
export async function executeToolCall<NAME extends AgentToolName>(
  name: NAME,
  input: unknown,
  context: ToolContext
): Promise<AgentToolOutput<NAME>> {
  const toolModule: ToolModule<NAME> = toolModules[name];
  return toolModule.execute(parseToolInput(name, input), context);
}
