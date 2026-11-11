import { readFile as readText, stat, writeFile as writeText } from "node:fs/promises";
import { tool, type DeepPartial } from "ai";
import { z } from "zod";
import { plural } from "../../core/describe";
import type { ToolContext } from "../../core/tool-context";

const inputSchema = z.object({
  path: z.string().describe("File path, relative to the project root."),
  oldString: z.string().min(1).describe("Exact text to replace, including whitespace and indentation."),
  newString: z.string().describe("Replacement text."),
  replaceAll: z.boolean().optional().describe("Replace every occurrence. Defaults to false, which requires exactly one match.")
});

const outputSchema = z.object({
  path: z.string(),
  replacements: z.number()
});

export const editFileTool = tool({
  description:
    "Replace an exact string in an existing file. oldString must match the file exactly and, " +
    "unless replaceAll is true, appear exactly once; include surrounding lines to make it unique.",
  inputSchema,
  outputSchema
});

function countOccurrences(text: string, search: string) {
  let count = 0;
  for (let index = text.indexOf(search); index !== -1; index = text.indexOf(search, index + search.length)) count++;
  return count;
}

async function execute(input: z.infer<typeof inputSchema>, { workspace }: ToolContext): Promise<z.infer<typeof outputSchema>> {
  if (input.oldString === input.newString) throw new Error("oldString and newString are identical.");

  const file = await workspace.resolve(input.path);
  const info = await stat(file.absolute).catch(() => null);
  if (!info) throw new Error(`File not found: ${input.path}`);
  if (!info.isFile()) throw new Error(`Not a file: ${input.path}`);

  const content = await readText(file.absolute, "utf8");
  const occurrences = countOccurrences(content, input.oldString);
  if (occurrences === 0) throw new Error(`oldString was not found in ${input.path}.`);
  if (occurrences > 1 && !input.replaceAll) {
    throw new Error(`oldString appears ${occurrences} times in ${input.path}; add context to make it unique or set replaceAll.`);
  }

  // split/join and slicing avoid String.replace's special `$` patterns in newString.
  const updated = input.replaceAll
    ? content.split(input.oldString).join(input.newString)
    : (() => {
        const index = content.indexOf(input.oldString);
        return content.slice(0, index) + input.newString + content.slice(index + input.oldString.length);
      })();
  await writeText(file.absolute, updated, "utf8");

  return { path: file.relative, replacements: input.replaceAll ? occurrences : 1 };
}

function describeInput(input: DeepPartial<z.infer<typeof inputSchema>>) {
  return input.path;
}

function describeOutput(output: z.infer<typeof outputSchema>) {
  return plural(output.replacements, "replacement");
}

export const editFile = { tool: editFileTool, inputSchema, execute, describeInput, describeOutput };
