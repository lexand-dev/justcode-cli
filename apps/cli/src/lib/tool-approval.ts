import type { AgentToolName } from '@justcode/tools'

/** A tool call waiting for the user's decision (see `toolNeedsApproval`). */
export type ApprovalRequest = {
  toolCallId: string
  toolName: AgentToolName
  /** What will run, e.g. the shell command. */
  summary: string
  /** The model's short explanation of the call, when it gave one. */
  description?: string
}

/** Run this call, run every call for the rest of the session, or refuse. */
export type ApprovalDecision = 'once' | 'session' | 'deny'

/** Sent to the model as the tool error when the user refuses a call. */
export const TOOL_DENIED_MESSAGE =
  'The user denied this tool call. Do not retry it; ask the user how they want to proceed.'
