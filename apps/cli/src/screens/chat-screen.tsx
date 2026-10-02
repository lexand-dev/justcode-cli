import { useChat } from '@ai-sdk/react'
import { useKeyboard } from '@opentui/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { z } from 'zod'
import { ChatError, ChatMessage } from '../components/chat-message'
import { ChatShell } from '../components/chat-shell'
import { ChatTextarea } from '../components/chat-textarea'
import { client } from '../lib/client'

const chatStateSchema = z.object({ message: z.string().refine((message) => message.trim().length > 0) })
const transport = new DefaultChatTransport({ api: client.chat.$url().toString() })

type TranscriptEntry =
  | { type: 'message'; id: string; snapshot?: UIMessage }
  | { type: 'error'; id: string; text: string }

function Conversation({ prompt }: { prompt: string | null }) {
  const { messages, sendMessage, regenerate, status, error } = useChat({ transport })
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const recordedMessageIds = useRef(new Set<string>())
  const recordedError = useRef<Error | undefined>(undefined)

  useEffect(() => {
    const newMessages = messages.filter((message) => !recordedMessageIds.current.has(message.id))
    const shouldRecordError = error !== undefined && error !== recordedError.current
    if (newMessages.length === 0 && !shouldRecordError) return

    for (const message of newMessages) recordedMessageIds.current.add(message.id)
    if (shouldRecordError) recordedError.current = error
    const errorEntry: TranscriptEntry | undefined = shouldRecordError && error
      ? { type: 'error', id: crypto.randomUUID(), text: error.message }
      : undefined

    setTranscript((entries) => {
      let next: TranscriptEntry[] = [
        ...entries,
        ...newMessages.map((message) => ({ type: 'message' as const, id: message.id })),
      ]

      if (errorEntry) {
        const failed = messages.at(-1)
        if (failed?.role === 'assistant') {
          // Regenerate removes this message from useChat; keep what was visible before the error.
          next = next.map((entry) => entry.type === 'message' && entry.id === failed.id
            ? { ...entry, snapshot: failed }
            : entry)
        }
        next.push(errorEntry)
      }

      return next
    })
  }, [messages, error])

  useEffect(() => {
    if (prompt !== null) void sendMessage({ text: prompt })
  }, [prompt, sendMessage])

  useKeyboard((key) => {
    if (key.ctrl && key.name === 'r' && status === 'error') void regenerate()
  })

  const currentMessages = new Map(messages.map((message) => [message.id, message]))
  const latestError = transcript.findLast((entry) => entry.type === 'error')

  return (
    <ChatShell
      composer={
        <ChatTextarea
          disabled={status !== 'ready'}
          onSend={(text) => { void sendMessage({ text }) }}
        />
      }
    >
      {transcript.map((entry) => {
        if (entry.type === 'error') {
          return (
            <ChatError
              key={entry.id}
              message={entry.text}
              retryAvailable={status === 'error' && entry.id === latestError?.id}
            />
          )
        }

        const message = currentMessages.get(entry.id) ?? entry.snapshot
        return message ? <ChatMessage key={entry.id} message={message} /> : null
      })}
      {status === 'submitted' ? <text>Generating...</text> : null}
    </ChatShell>
  )
}

export function ChatScreen() {
  const { state, key } = useLocation()
  const chatState = chatStateSchema.safeParse(state)

  return <Conversation key={key} prompt={chatState.success ? chatState.data.message : null} />
}
