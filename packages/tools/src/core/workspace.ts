import { realpathSync } from "node:fs";
import { realpath } from "node:fs/promises";
import path from "node:path";

export type ResolvedPath = {
  /** Real absolute path on disk (symlinks in existing ancestors resolved). */
  absolute: string;
  /** Path relative to the workspace root, as shown to the model. */
  relative: string;
};

export type Workspace = {
  readonly root: string;
  /** Resolves a model-provided path and throws if it points outside the workspace root. */
  resolve(inputPath: string): Promise<ResolvedPath>;
};

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

/**
 * Resolves symlinks in the deepest existing ancestor of `target`, then rejoins the
 * segments that do not exist yet. New files can be checked, and a symlink that
 * points outside the root cannot bypass the check.
 */
async function realpathAllowingMissing(target: string): Promise<string> {
  const missing: string[] = [];
  let current = target;

  while (true) {
    try {
      const real = await realpath(current);
      return missing.length === 0 ? real : path.join(real, ...missing.reverse());
    } catch (error) {
      if (!isErrnoException(error) || error.code !== "ENOENT") throw error;
      const parent = path.dirname(current);
      if (parent === current) throw error;
      missing.push(path.basename(current));
      current = parent;
    }
  }
}

function isInside(root: string, candidate: string) {
  const relative = path.relative(root, candidate);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function createWorkspace(rootDirectory: string): Workspace {
  const root = realpathSync(rootDirectory);

  return {
    root,
    async resolve(inputPath) {
      if (inputPath.length === 0) throw new Error("Path must not be empty.");

      const absolute = await realpathAllowingMissing(path.resolve(root, inputPath));
      if (!isInside(root, absolute)) {
        throw new Error(`Path is outside the workspace: ${inputPath}`);
      }

      return { absolute, relative: path.relative(root, absolute) || "." };
    }
  };
}
