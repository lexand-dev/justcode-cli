import { useChat } from '@ai-sdk/react'
import { useKeyboard } from '@opentui/react'
import { DefaultChatTransport } from 'ai'
import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { z } from 'zod'
import { ChatTextarea } from '../components/chat-textarea'
import { client } from '../lib/client'

const chatStateSchema = z.object({ message: z.string().refine((message) => message.trim().length > 0) })
const transport = new DefaultChatTransport({ api: client.chat.$url().toString() })

function Conversation({ prompt }: { prompt: string | null }) {
  const { messages, sendMessage, regenerate, status, error } = useChat({ transport })

  useEffect(() => {
    if (prompt !== null) void sendMessage({ text: prompt })
  }, [prompt, sendMessage])

  useKeyboard((key) => {
    if (key.ctrl && key.name === 'r' && status === 'error') void regenerate()
  })

  return (
    <box flexDirection="column" flexGrow={1} height="100%" padding={1} gap={1}>
      <scrollbox flexGrow={1} minHeight={1} stickyScroll stickyStart="bottom">
        {messages.map((message) => (
          <box key={message.id} flexDirection="column" marginBottom={1}>
            <text><strong>{message.role === 'user' ? 'You' : 'Assistant'}</strong></text>
            {message.parts.map((part, index) =>
              part.type === 'text' ? <text key={index}>{part.text}</text> : null,
            )}
          </box>
        ))}
        {status === 'submitted' ? <text>Generating...</text> : null}
      </scrollbox>
      {error ? <text>Failed to generate: {error.message} (Ctrl+R to retry)</text> : null}
      <ChatTextarea
        disabled={status !== 'ready'}
        onSend={(text) => { void sendMessage({ text }) }}
      />
    </box>
  )
}

export function ChatScreen() {
  const { state, key } = useLocation()
  const chatState = chatStateSchema.safeParse(state)

  return <Conversation key={key} prompt={chatState.success ? chatState.data.message : null} />
}
