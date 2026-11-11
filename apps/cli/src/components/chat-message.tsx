import type { AgentTools, ChatUIMessage } from '@justcode/tools'
import { describeToolInput, describeToolOutput, isAgentToolName, previewToolOutput } from '@justcode/tools/execute'
import {
  getToolName,
  isStaticToolUIPart,
  isToolUIPart,
  type DynamicToolUIPart,
  type InferUITools,
  type ToolUIPart,
} from 'ai'
import { markdownStyle, theme } from '../lib/theme'
import { TOOL_DENIED_MESSAGE } from '../lib/tool-approval'

type AgentToolPart = ToolUIPart<InferUITools<AgentTools>>

type ToolDescription = { target?: string; summary?: string; preview: string[] }

/**
 * What a call targets (e.g. `src/app.ts`), its result summary (e.g. `12 lines`), and the result lines
 * shown under it, as each tool describes them.
 */
function describeToolCall(part: AgentToolPart | DynamicToolUIPart): ToolDescription {
  const name = getToolName(part)
  if (!isStaticToolUIPart(part) || !isAgentToolName(name)) return { preview: [] }
  const done = part.state === 'output-available'
  return {
    target: part.input === undefined ? undefined : describeToolInput(name, part.input),
    summary: done ? describeToolOutput(name, part.output) : undefined,
    preview: done ? previewToolOutput(name, part.output) : [],
  }
}

type ToolStatus = { color: string; label: string; detail?: string }

function toolStatus(part: AgentToolPart | DynamicToolUIPart, summary: string | undefined): ToolStatus {
  switch (part.state) {
    case 'input-streaming':
      return { color: theme.running, label: 'preparing…' }
    case 'input-available':
      return { color: theme.running, label: 'running…' }
    case 'approval-requested':
      return { color: theme.warning, label: 'awaiting approval' }
    case 'approval-responded':
      return part.approval.approved
        ? { color: theme.running, label: 'approved' }
        : { color: theme.error, label: 'denied' }
    case 'output-available': {
      const failedCommand = part.type === 'tool-bash' && part.output.exitCode !== 0
      return { color: failedCommand ? theme.error : theme.success, label: summary ?? (part.preliminary ? 'partial result' : 'done') }
    }
    case 'output-error':
      return part.errorText === TOOL_DENIED_MESSAGE
        ? { color: theme.error, label: 'denied' }
        : { color: theme.error, label: 'failed', detail: part.errorText }
    case 'output-denied':
      return { color: theme.error, label: 'denied' }
  }
}

function ToolPart({ part }: { part: AgentToolPart | DynamicToolUIPart }) {
  const { target, summary, preview } = describeToolCall(part)
  const status = toolStatus(part, summary)

  return (
    <box flexDirection="column">
      <text>
        <span fg={status.color}>● </span>
        <span fg={theme.toolName}><strong>{getToolName(part)}</strong></span>
        {target ? ` ${target}` : ''}
        <span fg={theme.muted}> · {status.label}</span>
      </text>
      {status.detail ? <text fg={theme.error}>  ⎿ {status.detail}</text> : null}
      {preview.map((line, index) => (
        <text key={index} fg={theme.muted}>{index === 0 ? '  ⎿ ' : '    '}{line}</text>
      ))}
    </box>
  )
}

type MessagePart = ChatUIMessage['parts'][number]

/** Consecutive parts of the same kind (e.g. a run of tool calls) render without a gap. */
function partKind(part: MessagePart) {
  if (part.type === 'text' || part.type === 'reasoning') return part.type
  if (isToolUIPart(part)) return 'tool'
  return undefined
}

function AssistantPart({ part }: { part: MessagePart }) {
  if (part.type === 'text') {
    return (
      <markdown
        content={part.text}
        syntaxStyle={markdownStyle}
        streaming={part.state === 'streaming'}
      />
    )
  }
  if (part.type === 'reasoning') {
    return <text fg={theme.muted}><em>Thinking: {part.text}</em></text>
  }
  if (isToolUIPart(part)) return <ToolPart part={part} />
  return null
}

function UserMessage({ message }: { message: ChatUIMessage }) {
  const text = message.parts.flatMap((part) => part.type === 'text' ? [part.text] : []).join('\n')

  return (
    <box
      border={['left']}
      borderStyle="heavy"
      borderColor={theme.user}
      backgroundColor={theme.userBackground}
      paddingX={1}
      marginBottom={1}
    >
      <text>{text}</text>
    </box>
  )
}

export function ChatMessage({ message }: { message: ChatUIMessage }) {
  if (message.role === 'user') return <UserMessage message={message} />

  // Skip parts with nothing to show, such as step markers or a text part that has not streamed yet.
  const parts = message.parts.filter((part) => {
    if (part.type === 'text' || part.type === 'reasoning') return part.text.trim().length > 0
    return partKind(part) !== undefined
  })

  return (
    <box flexDirection="column" marginBottom={1} paddingLeft={message.role === 'system' ? 0 : 1}>
      {message.role === 'system' ? <text fg={theme.muted}><strong>System</strong></text> : null}
      {parts.map((part, index) => {
        const previous = parts[index - 1]
        const gap = previous !== undefined && partKind(previous) !== partKind(part)
        return (
          <box key={index} marginTop={gap ? 1 : 0}>
            <AssistantPart part={part} />
          </box>
        )
      })}
    </box>
  )
}

export function ChatError({ message, retryAvailable }: { message: string; retryAvailable: boolean }) {
  return (
    <box border={['left']} borderStyle="heavy" borderColor={theme.error} paddingX={1} marginBottom={1}>
      <text>
        <span fg={theme.error}><strong>Error</strong> {message}</span>
        {retryAvailable ? <span fg={theme.muted}>  Ctrl+R to retry</span> : null}
      </text>
    </box>
  )
}
