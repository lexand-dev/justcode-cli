import type { AgentToolName } from '@justcode/tools'
import type { ApprovalPrompt } from '@justcode/tools/execute'

/** A tool call waiting for the user's decision (see `describeToolApproval`). */
export type ApprovalRequest = ApprovalPrompt & {
  toolCallId: string
  toolName: AgentToolName
}

/** Run this call, run every call for the rest of the session, or refuse. */
export type ApprovalDecision = 'once' | 'session' | 'deny'

/**
 * The tool error sent to the model when the user refuses a call. The AI SDK's `output-denied`
 * state is only for server-run tools, so a denial travels as an `output-error` and is recognized
 * by this text. Stored sessions keep it: changing it makes old denials show as failures.
 */
const TOOL_DENIED_MESSAGE =
  'The user denied this tool call. Do not retry it; ask the user how they want to proceed.'

/** The error `onToolCall` throws when the user refuses a call; the CLI sends it as an `output-error`. */
export function toolDeniedError() {
  return new Error(TOOL_DENIED_MESSAGE)
}

/** Whether an `output-error` tool part records a call the user refused (see `toolDeniedError`). */
export function isToolDeniedError(errorText: string) {
  return errorText === TOOL_DENIED_MESSAGE
}
