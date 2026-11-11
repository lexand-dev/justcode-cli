import path from "node:path";
import { tool, type DeepPartial } from "ai";
import { z } from "zod";
import { resolveDirectory, walkFiles } from "../../core/walk";
import { plural } from "../../core/describe";
import type { ToolContext } from "../../core/tool-context";

const MAX_FILES = 500;

const inputSchema = z.object({
  pattern: z.string().optional().describe('Glob matched against paths relative to `path`, e.g. "**/*.ts". Defaults to all files.'),
  path: z.string().optional().describe("Directory to list, relative to the project root. Defaults to the root.")
});

const outputSchema = z.object({
  files: z.array(z.string()),
  truncated: z.boolean()
});

export const listFilesTool = tool({
  description:
    `List files in the project, optionally filtered by a glob. Returns up to ${MAX_FILES} paths ` +
    "relative to the project root. .git, node_modules, dist and build are skipped.",
  inputSchema,
  outputSchema
});

async function execute(input: z.infer<typeof inputSchema>, { workspace }: ToolContext): Promise<z.infer<typeof outputSchema>> {
  const directory = await resolveDirectory(workspace, input.path);
  const glob = input.pattern ? new Bun.Glob(input.pattern) : null;
  const files: string[] = [];

  for await (const file of walkFiles(workspace, directory.absolute)) {
    const relativeToDirectory = path.relative(directory.absolute, path.join(workspace.root, file));
    if (glob && !glob.match(relativeToDirectory)) continue;
    if (files.length === MAX_FILES) return { files, truncated: true };
    files.push(file);
  }

  return { files, truncated: false };
}

function describeInput(input: DeepPartial<z.infer<typeof inputSchema>>) {
  return input.pattern ?? input.path;
}

function describeOutput(output: z.infer<typeof outputSchema>) {
  return `${plural(output.files.length, "file")}${output.truncated ? " (truncated)" : ""}`;
}

export const listFiles = { tool: listFilesTool, inputSchema, execute, describeInput, describeOutput };
