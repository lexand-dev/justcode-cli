import type { AgentToolName } from '@justcode/tools'
import type { ApprovalPrompt } from '@justcode/tools/execute'

/** A tool call waiting for the user's decision (see `describeToolApproval`). */
export type ApprovalRequest = ApprovalPrompt & {
  toolCallId: string
  toolName: AgentToolName
}

/** Run this call, run every call for the rest of the session, or refuse. */
export type ApprovalDecision = 'once' | 'session' | 'deny'

/** Sent to the model as the tool error when the user refuses a call. */
export const TOOL_DENIED_MESSAGE =
  'The user denied this tool call. Do not retry it; ask the user how they want to proceed.'
