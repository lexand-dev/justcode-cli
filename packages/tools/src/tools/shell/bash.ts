import { tool, type DeepPartial } from "ai";
import { z } from "zod";
import { firstLine } from "../../core/describe";
import type { ToolContext } from "../../core/tool-context";
import { resolveDirectory } from "../../core/walk";
import { runCommand } from "./run-command";

const DEFAULT_TIMEOUT_MS = 2 * 60 * 1000;
const MAX_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_OUTPUT_CHARS = 30_000;

const inputSchema = z.object({
  command: z.string().min(1).describe('The shell command to run, e.g. "bun run typecheck".'),
  description: z
    .string()
    .optional()
    .describe('What the command does in 5-10 words, shown to the user when asking for approval, e.g. "Run the type checker".'),
  workdir: z
    .string()
    .optional()
    .describe("Directory to run in, relative to the project root. Defaults to the root. Use this instead of `cd`."),
  timeout: z
    .number()
    .int()
    .min(1000)
    .max(MAX_TIMEOUT_MS)
    .optional()
    .describe(`Timeout in milliseconds, up to ${MAX_TIMEOUT_MS}. Defaults to ${DEFAULT_TIMEOUT_MS}.`)
});

const outputSchema = z.object({
  exitCode: z.number().nullable(),
  output: z.string(),
  truncated: z.boolean(),
  timedOut: z.boolean()
});

export const bashTool = tool({
  description:
    "Run a shell command with bash in the project and return its exit code and combined stdout and stderr. " +
    "The user approves each command before it runs. Use it for builds, tests, type checks, git, and package " +
    "managers; prefer readFile, listFiles, searchFiles, editFile, and writeFile for working with files.\n" +
    "- Every call starts a fresh, non-interactive shell with no stdin: `cd`, exports, and aliases do not carry " +
    "over to the next call (use workdir instead of cd). Pass flags that skip prompts, such as --yes.\n" +
    `- Commands are stopped after ${DEFAULT_TIMEOUT_MS / 1000} seconds by default (set timeout, up to ` +
    `${MAX_TIMEOUT_MS / 60_000} minutes). Do not start servers, watchers, or other commands that never exit; ` +
    "background processes are stopped when the command ends.\n" +
    `- Output over ${MAX_OUTPUT_CHARS} characters keeps its beginning and end. A non-zero exit code is ` +
    "reported in exitCode, not raised as an error.",
  inputSchema,
  outputSchema
});

async function execute(
  input: z.infer<typeof inputSchema>,
  { workspace, abortSignal }: ToolContext
): Promise<z.infer<typeof outputSchema>> {
  // The working directory is confined to the workspace; the command itself is not, which is
  // why every bash call needs the user's approval.
  const directory = await resolveDirectory(workspace, input.workdir);
  return runCommand({
    command: input.command,
    cwd: directory.absolute,
    timeoutMs: input.timeout ?? DEFAULT_TIMEOUT_MS,
    maxOutputChars: MAX_OUTPUT_CHARS,
    abortSignal
  });
}

function describeInput(input: DeepPartial<z.infer<typeof inputSchema>>) {
  return input.command === undefined ? undefined : firstLine(input.command, 80);
}

function describeOutput(output: z.infer<typeof outputSchema>) {
  if (output.timedOut) return "timed out";
  return output.exitCode === null ? "killed" : `exit ${output.exitCode}`;
}

function describeApproval(input: z.infer<typeof inputSchema>) {
  return { title: "Run command?", summary: `$ ${input.command}`, description: input.description };
}

function isFailedOutput(output: z.infer<typeof outputSchema>) {
  return output.exitCode !== 0;
}

const PREVIEW_LINES = 4;

function previewOutput(output: z.infer<typeof outputSchema>) {
  const lines = output.output.trimEnd().split("\n").filter((line) => line.length > 0);
  const shown = lines.slice(-PREVIEW_LINES).map((line) => firstLine(line, 120));
  return lines.length > PREVIEW_LINES ? [`… ${lines.length - PREVIEW_LINES} more lines`, ...shown] : shown;
}

export const bash = {
  tool: bashTool,
  inputSchema,
  execute,
  describeApproval,
  describeInput,
  describeOutput,
  previewOutput,
  isFailedOutput
};
