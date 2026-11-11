import type { Workspace } from "./workspace";

/** What a tool's `execute` receives besides its validated input. */
export type ToolContext = {
  /** The project root every path is confined to. */
  workspace: Workspace;
  /** Aborts a running tool, e.g. when the CLI closes the chat. */
  abortSignal?: AbortSignal;
};
