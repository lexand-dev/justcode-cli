import { readFile as readBytes, stat } from "node:fs/promises";
import path from "node:path";
import { tool } from "ai";
import { z } from "zod";
import { isBinary, resolveDirectory, walkFiles } from "../../core/walk";
import type { ToolContext } from "../../core/tool-context";

const MAX_MATCHES = 200;
const MAX_LINE_LENGTH = 300;
const MAX_FILE_BYTES = 1024 * 1024;

const inputSchema = z.object({
  pattern: z.string().min(1).describe("JavaScript regular expression to search for, matched per line."),
  path: z.string().optional().describe("Directory to search, relative to the project root. Defaults to the root."),
  glob: z.string().optional().describe('Only search files whose path (relative to `path`) matches this glob, e.g. "**/*.ts".'),
  ignoreCase: z.boolean().optional().describe("Case-insensitive matching. Defaults to false.")
});

const outputSchema = z.object({
  matches: z.array(z.object({ path: z.string(), line: z.number(), text: z.string() })),
  truncated: z.boolean()
});

export const searchFilesTool = tool({
  description:
    `Search file contents in the project with a regular expression. Returns up to ${MAX_MATCHES} ` +
    "matching lines with their path and 1-based line number. Binary files, files over 1 MB, " +
    ".git, node_modules, dist and build are skipped.",
  inputSchema,
  outputSchema
});

async function execute(input: z.infer<typeof inputSchema>, { workspace }: ToolContext): Promise<z.infer<typeof outputSchema>> {
  let regex: RegExp;
  try {
    regex = new RegExp(input.pattern, input.ignoreCase ? "i" : "");
  } catch {
    throw new Error(`Invalid regular expression: ${input.pattern}`);
  }

  const directory = await resolveDirectory(workspace, input.path);
  const glob = input.glob ? new Bun.Glob(input.glob) : null;
  const matches: z.infer<typeof outputSchema>["matches"] = [];

  for await (const file of walkFiles(workspace, directory.absolute)) {
    const absolute = path.join(workspace.root, file);
    if (glob && !glob.match(path.relative(directory.absolute, absolute))) continue;

    const info = await stat(absolute).catch(() => null);
    if (!info || info.size > MAX_FILE_BYTES) continue;
    const bytes = await readBytes(absolute).catch(() => null);
    if (!bytes || isBinary(bytes)) continue;

    const lines = bytes.toString("utf8").split("\n");
    for (const [index, line] of lines.entries()) {
      if (!regex.test(line)) continue;
      if (matches.length === MAX_MATCHES) return { matches, truncated: true };
      matches.push({ path: file, line: index + 1, text: line.slice(0, MAX_LINE_LENGTH) });
    }
  }

  return { matches, truncated: false };
}

export const searchFiles = { tool: searchFilesTool, inputSchema, execute };
