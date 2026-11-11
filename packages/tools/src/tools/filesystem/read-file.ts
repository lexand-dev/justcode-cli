import { readFile as readBytes, stat } from "node:fs/promises";
import { tool, type DeepPartial } from "ai";
import { z } from "zod";
import { isBinary } from "../../core/walk";
import { plural } from "../../core/describe";
import type { ToolContext } from "../../core/tool-context";

const DEFAULT_LINE_LIMIT = 2000;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const inputSchema = z.object({
  path: z.string().describe("File path, relative to the project root."),
  offset: z.number().int().min(1).optional().describe("1-based line to start reading from. Defaults to 1."),
  limit: z.number().int().min(1).optional().describe(`Maximum number of lines to read. Defaults to ${DEFAULT_LINE_LIMIT}.`)
});

const outputSchema = z.object({
  path: z.string(),
  content: z.string(),
  startLine: z.number(),
  endLine: z.number(),
  totalLines: z.number(),
  truncated: z.boolean()
});

export const readFileTool = tool({
  description:
    "Read a text file in the project. Returns the requested lines verbatim (without line numbers) " +
    "plus the line range. Use offset/limit to page through large files. Read a file before editing it.",
  inputSchema,
  outputSchema
});

async function execute(input: z.infer<typeof inputSchema>, { workspace }: ToolContext): Promise<z.infer<typeof outputSchema>> {
  const file = await workspace.resolve(input.path);
  const info = await stat(file.absolute).catch(() => null);
  if (!info) throw new Error(`File not found: ${input.path}`);
  if (!info.isFile()) throw new Error(`Not a file: ${input.path}`);
  if (info.size > MAX_FILE_BYTES) throw new Error(`File is too large to read (${info.size} bytes): ${input.path}`);

  const bytes = await readBytes(file.absolute);
  if (isBinary(bytes)) throw new Error(`File looks binary and cannot be read as text: ${input.path}`);

  const lines = bytes.toString("utf8").split("\n");
  const startLine = input.offset ?? 1;
  const limit = input.limit ?? DEFAULT_LINE_LIMIT;
  const selected = lines.slice(startLine - 1, startLine - 1 + limit);

  return {
    path: file.relative,
    content: selected.join("\n"),
    startLine,
    endLine: startLine + selected.length - 1,
    totalLines: lines.length,
    truncated: startLine - 1 + selected.length < lines.length
  };
}

function describeInput(input: DeepPartial<z.infer<typeof inputSchema>>) {
  return input.path;
}

function describeOutput(output: z.infer<typeof outputSchema>) {
  return plural(output.endLine - output.startLine + 1, "line");
}

export const readFile = { tool: readFileTool, inputSchema, execute, describeInput, describeOutput };
