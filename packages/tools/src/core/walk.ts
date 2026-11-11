import type { Dirent } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { Workspace } from "./workspace";

/** Directories that are never listed or searched. */
const SKIPPED_DIRECTORIES = new Set([".git", "node_modules", "dist", "build"]);

/**
 * Yields every file under `directory` (an absolute path inside the workspace), as a path
 * relative to the workspace root. Skips the ignored directories, never descends into
 * symlinked directories, and drops symlinked files that resolve outside the workspace.
 */
export async function* walkFiles(workspace: Workspace, directory: string): AsyncGenerator<string> {
  let entries: Dirent[];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return; // Unreadable directory: skip it rather than failing the whole listing.
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) yield* walkFiles(workspace, absolute);
    } else if (entry.isFile()) {
      yield path.relative(workspace.root, absolute);
    } else if (entry.isSymbolicLink()) {
      try {
        const resolved = await workspace.resolve(absolute);
        if ((await stat(resolved.absolute)).isFile()) yield path.relative(workspace.root, absolute);
      } catch {
        // Broken link or a link outside the workspace: leave it out.
      }
    }
  }
}

/** Resolves an optional directory argument and checks that it is a directory. */
export async function resolveDirectory(workspace: Workspace, inputPath: string | undefined) {
  const resolved = await workspace.resolve(inputPath ?? ".");
  const info = await stat(resolved.absolute).catch(() => null);
  if (!info?.isDirectory()) throw new Error(`Not a directory: ${inputPath ?? "."}`);
  return resolved;
}

/** Whether a buffer looks like binary data (contains a NUL byte in its first 8 KB). */
export function isBinary(bytes: Uint8Array) {
  return bytes.subarray(0, 8192).includes(0);
}
