import { mkdir, stat, writeFile as writeBytes } from "node:fs/promises";
import path from "node:path";
import { tool, type DeepPartial } from "ai";
import { z } from "zod";
import type { ToolContext } from "../../core/tool-context";

const inputSchema = z.object({
  path: z.string().describe("File path, relative to the project root."),
  content: z.string().describe("The complete new file content.")
});

const outputSchema = z.object({
  path: z.string(),
  created: z.boolean(),
  bytes: z.number()
});

export const writeFileTool = tool({
  description:
    "Create a file, or overwrite an existing file with the given content. Missing parent " +
    "directories are created. Prefer editFile for changes to existing files.",
  inputSchema,
  outputSchema
});

async function execute(input: z.infer<typeof inputSchema>, { workspace }: ToolContext): Promise<z.infer<typeof outputSchema>> {
  const file = await workspace.resolve(input.path);
  const existing = await stat(file.absolute).catch(() => null);
  if (existing && !existing.isFile()) throw new Error(`Not a file: ${input.path}`);

  await mkdir(path.dirname(file.absolute), { recursive: true });
  await writeBytes(file.absolute, input.content, "utf8");

  return { path: file.relative, created: existing === null, bytes: Buffer.byteLength(input.content, "utf8") };
}

function describeInput(input: DeepPartial<z.infer<typeof inputSchema>>) {
  return input.path;
}

function describeOutput(output: z.infer<typeof outputSchema>) {
  return output.created ? "created" : "overwritten";
}

export const writeFile = { tool: writeFileTool, inputSchema, execute, describeInput, describeOutput };
