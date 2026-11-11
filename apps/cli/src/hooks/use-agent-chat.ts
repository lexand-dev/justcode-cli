import { useChat } from '@ai-sdk/react'
import type { ChatUIMessage } from '@justcode/tools'
import { describeToolApproval, executeToolCall } from '@justcode/tools/execute'
import {
  DefaultChatTransport,
  type ChatOnToolCallCallback,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai'
import { useEffect, useMemo, useRef } from 'react'
import { client } from '../lib/client'
import { TOOL_DENIED_MESSAGE } from '../lib/tool-approval'
import { workspace } from '../lib/workspace'
import { useToolApprovals, type ToolApprovals } from './use-tool-approvals'

// Stops an assistant turn from calling tools forever; the user can send a message to continue.
export const MAX_TOOL_CALLS_PER_TURN = 25

type AgentToolCall = Parameters<ChatOnToolCallCallback<ChatUIMessage>>[0]['toolCall'] & { dynamic?: false }

function createChatTransport(sessionId: string) {
  return new DefaultChatTransport<ChatUIMessage>({
    api: client.chat[':sessionId'].$url({ param: { sessionId } }).toString(),
    // The server loads the history from the database; send only the newest message.
    prepareSendMessagesRequest: ({ messages }) => ({ body: { message: messages.at(-1) } }),
  })
}

function reachedToolCallLimit(messages: ChatUIMessage[]) {
  const last = messages.at(-1)
  const toolCalls = last?.role === 'assistant' ? last.parts.filter(isToolUIPart).length : 0
  return toolCalls >= MAX_TOOL_CALLS_PER_TURN
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Runs a tool call against the workspace. Tools that can act outside the workspace guardrail,
 * such as bash, run only once approved; a denial throws `TOOL_DENIED_MESSAGE`.
 */
async function runToolCall(
  toolCall: AgentToolCall,
  { requestApproval, abortSignal }: { requestApproval: ToolApprovals['requestApproval']; abortSignal?: AbortSignal },
) {
  const { toolCallId, toolName } = toolCall
  const approval = describeToolApproval(toolName, toolCall.input)
  if (approval) {
    const decision = await requestApproval({ ...approval, toolCallId, toolName })
    if (decision === 'deny') throw new Error(TOOL_DENIED_MESSAGE)
  }
  return executeToolCall(toolName, toolCall.input, { workspace, abortSignal })
}

/** Aborts running tools (such as a shell command) when the chat unmounts. */
function useUnmountSignal() {
  const controller = useRef<AbortController | null>(null)
  useEffect(() => {
    const current = new AbortController()
    controller.current = current
    return () => current.abort()
  }, [])
  return controller
}

/**
 * `useChat` for one session. The server only forwards tool calls; they run here, against the
 * launch directory, and the assistant message is resent once every call has an output.
 */
export function useAgentChat({ sessionId, initialMessages }: { sessionId: string; initialMessages: ChatUIMessage[] }) {
  const transport = useMemo(() => createChatTransport(sessionId), [sessionId])
  const approvals = useToolApprovals()
  const unmountSignal = useUnmountSignal()

  const { messages, sendMessage, regenerate, addToolOutput, status, error } = useChat<ChatUIMessage>({
    id: sessionId,
    messages: initialMessages,
    transport,
    async onToolCall({ toolCall }) {
      if (toolCall.dynamic) return

      const { toolName: tool, toolCallId } = toolCall
      try {
        const output = await runToolCall(toolCall, {
          requestApproval: approvals.requestApproval,
          abortSignal: unmountSignal.current?.signal,
        })
        // Not awaited, as the AI SDK recommends, to avoid deadlocking the chat's job queue.
        void addToolOutput({ tool, toolCallId, output })
      } catch (toolError) {
        void addToolOutput({ state: 'output-error', tool, toolCallId, errorText: errorMessage(toolError) })
      }
    },
    sendAutomaticallyWhen: ({ messages }) =>
      lastAssistantMessageIsCompleteWithToolCalls({ messages }) && !reachedToolCallLimit(messages),
  })

  const toolLimitReached = status === 'ready'
    && lastAssistantMessageIsCompleteWithToolCalls({ messages })
    && reachedToolCallLimit(messages)

  return { messages, sendMessage, regenerate, status, error, approvals, toolLimitReached }
}
