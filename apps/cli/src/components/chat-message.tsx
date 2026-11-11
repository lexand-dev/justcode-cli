import type { AgentTools, ChatUIMessage } from '@justcode/tools'
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

/** The file, directory, or pattern a tool call targets, e.g. `src/app.ts`. */
function describeInput(part: AgentToolPart): string | undefined {
  if (!part.input) return undefined
  switch (part.type) {
    case 'tool-readFile':
    case 'tool-writeFile':
    case 'tool-editFile':
      return part.input.path
    case 'tool-listFiles':
      return part.input.pattern ?? part.input.path
    case 'tool-searchFiles':
      return part.input.pattern
    case 'tool-bash':
      return part.input.command === undefined ? undefined : firstLine(part.input.command, 80)
  }
}

/** The first line of `text`, at most `maxLength` characters; an ellipsis marks anything left out. */
function firstLine(text: string, maxLength: number) {
  const [line = ''] = text.split('\n')
  const kept = line.length > maxLength ? line.slice(0, maxLength - 1) : line
  return kept === text ? text : `${kept}…`
}

const PREVIEW_LINES = 4

/** The last lines of a command's output, shown under the call. */
function outputPreview(part: AgentToolPart): string[] {
  if (part.type !== 'tool-bash' || part.state !== 'output-available') return []
  const lines = part.output.output.trimEnd().split('\n').filter((line) => line.length > 0)
  const shown = lines.slice(-PREVIEW_LINES).map((line) => firstLine(line, 120))
  return lines.length > PREVIEW_LINES ? [`… ${lines.length - PREVIEW_LINES} more lines`, ...shown] : shown
}

/** A short result summary, e.g. `1 replacement`. */
function describeOutput(part: AgentToolPart): string | undefined {
  if (part.state !== 'output-available') return undefined
  const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`
  switch (part.type) {
    case 'tool-readFile':
      return plural(part.output.endLine - part.output.startLine + 1, 'line')
    case 'tool-writeFile':
      return part.output.created ? 'created' : 'overwritten'
    case 'tool-editFile':
      return plural(part.output.replacements, 'replacement')
    case 'tool-listFiles':
      return `${plural(part.output.files.length, 'file')}${part.output.truncated ? ' (truncated)' : ''}`
    case 'tool-searchFiles':
      return `${plural(part.output.matches.length, 'match')}${part.output.truncated ? ' (truncated)' : ''}`
    case 'tool-bash':
      if (part.output.timedOut) return 'timed out'
      return part.output.exitCode === null ? 'killed' : `exit ${part.output.exitCode}`
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
  const target = isStaticToolUIPart(part) ? describeInput(part) : undefined
  const summary = isStaticToolUIPart(part) ? describeOutput(part) : undefined
  const status = toolStatus(part, summary)
  const preview = isStaticToolUIPart(part) ? outputPreview(part) : []

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
