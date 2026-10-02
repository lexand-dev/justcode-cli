import { getToolName, isToolUIPart, type DynamicToolUIPart, type ToolUIPart, type UIMessage } from 'ai'

function ToolPart({ part }: { part: ToolUIPart | DynamicToolUIPart }) {
  const name = getToolName(part)

  switch (part.state) {
    case 'input-streaming':
      return <text>Tool {name}: preparing...</text>
    case 'input-available':
      return <text>Tool {name}: invoked</text>
    case 'approval-requested':
      return <text>Tool {name}: awaiting approval</text>
    case 'approval-responded':
      return <text>Tool {name}: {part.approval.approved ? 'approved' : 'denied'}</text>
    case 'output-available':
      return <text>Tool {name}: {part.preliminary ? 'result available' : 'completed'}</text>
    case 'output-error':
      return <text>Tool {name}: failed — {part.errorText}</text>
    case 'output-denied':
      return <text>Tool {name}: denied</text>
  }
}

export function ChatMessage({ message }: { message: UIMessage }) {
  const label = message.role === 'user' ? 'You' : message.role === 'assistant' ? 'Assistant' : 'System'

  return (
    <box flexDirection="column" marginBottom={1}>
      <text><strong>{label}</strong></text>
      {message.parts.map((part, index) => {
        if (part.type === 'text') return <text key={index}>{part.text}</text>
        if (part.type === 'reasoning') return <text key={index}>Reasoning: {part.text}</text>
        if (isToolUIPart(part)) return <ToolPart key={index} part={part} />
        return null
      })}
    </box>
  )
}

export function ChatError({ message, retryAvailable }: { message: string; retryAvailable: boolean }) {
  return (
    <box marginBottom={1}>
      <text>Error: {message}{retryAvailable ? ' (Ctrl+R to retry)' : ''}</text>
    </box>
  )
}
