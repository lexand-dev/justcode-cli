import { createWorkspace } from '@justcode/tools/execute'

// Like other coding agents, JustCode works on the directory it was launched from.
// Every tool call is confined to this root (see packages/tools/src/workspace.ts).
export const workspace = createWorkspace(process.cwd())
