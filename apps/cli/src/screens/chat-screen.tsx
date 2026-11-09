import { useChat } from '@ai-sdk/react'
import { useKeyboard } from '@opentui/react'
import type { ChatUIMessage } from '@justcode/server/chat-tools'
import { DefaultChatTransport, safeValidateUIMessages } from 'ai'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router'
import { z } from 'zod'
import { ChatError, ChatMessage } from '../components/chat-message'
import { ChatShell } from '../components/chat-shell'
import { ChatTextarea } from '../components/chat-textarea'
import { client } from '../lib/client'

const sessionParamsSchema = z.object({ sessionId: z.uuid() })
const chatStateSchema = z.object({ message: z.string().refine((message) => message.trim().length > 0) })
const sessionMessagesSchema = z.object({ messages: z.array(z.unknown()) })

type TranscriptEntry =
  | { type: 'message'; id: string; snapshot?: ChatUIMessage }
  | { type: 'error'; id: string; text: string }

type Hydration =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; messages: ChatUIMessage[] }

async function fetchSessionMessages(sessionId: string): Promise<ChatUIMessage[]> {
  const response = await client.sessions[':sessionId'].messages.$get({ param: { sessionId } })
  if (response.status === 404) throw new Error('Session not found.')
  if (!response.ok) throw new Error(`Could not load the session (HTTP ${response.status}).`)

  const body = sessionMessagesSchema.safeParse(await response.json())
  if (!body.success) throw new Error('Unexpected response while loading the session.')
  // safeValidateUIMessages rejects an empty list; a new session has no messages yet.
  if (body.data.messages.length === 0) return []

  const validated = await safeValidateUIMessages<ChatUIMessage>({ messages: body.data.messages })
  if (!validated.success) throw new Error('The session contains invalid messages.')
  return validated.data
}

function useSessionMessages(sessionId: string): Hydration {
  const [hydration, setHydration] = useState<Hydration>({ status: 'loading' })

  useEffect(() => {
    let active = true
    setHydration({ status: 'loading' })

    fetchSessionMessages(sessionId).then(
      (messages) => { if (active) setHydration({ status: 'ready', messages }) },
      (error: unknown) => {
        if (active) setHydration({ status: 'error', error: error instanceof Error ? error.message : 'Could not load the session.' })
      },
    )

    return () => {
      active = false
    }
  }, [sessionId])

  return hydration
}

function Conversation({
  sessionId,
  initialMessages,
  prompt,
}: {
  sessionId: string
  initialMessages: ChatUIMessage[]
  prompt: string | null
}) {
  const transport = useMemo(() => new DefaultChatTransport<ChatUIMessage>({
    api: client.chat[':sessionId'].$url({ param: { sessionId } }).toString(),
    // The server loads the history from the database; send only the newest message.
    prepareSendMessagesRequest: ({ messages }) => ({ body: { message: messages.at(-1) } }),
  }), [sessionId])
  const { messages, sendMessage, regenerate, status, error } = useChat<ChatUIMessage>({
    id: sessionId,
    messages: initialMessages,
    transport,
  })
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

function SessionChat({ sessionId, prompt }: { sessionId: string; prompt: string | null }) {
  const hydration = useSessionMessages(sessionId)

  if (hydration.status === 'ready') {
    return <Conversation sessionId={sessionId} initialMessages={hydration.messages} prompt={prompt} />
  }

  return (
    <box padding={1}>
      <text>{hydration.status === 'loading' ? 'Loading session...' : `Error: ${hydration.error}`}</text>
    </box>
  )
}

export function ChatScreen() {
  const { state, key } = useLocation()
  const params = sessionParamsSchema.safeParse(useParams())
  const chatState = chatStateSchema.safeParse(state)

  if (!params.success) {
    return (
      <box padding={1}>
        <text>Error: Invalid session id.</text>
      </box>
    )
  }

  return (
    <SessionChat
      key={key}
      sessionId={params.data.sessionId}
      prompt={chatState.success ? chatState.data.message : null}
    />
  )
}
