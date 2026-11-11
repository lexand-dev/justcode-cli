import type { ChatUIMessage } from '@justcode/tools'
import { useEffect, useRef, useState } from 'react'

export type TranscriptEntry =
  | { type: 'message'; id: string; snapshot?: ChatUIMessage }
  | { type: 'error'; id: string; text: string }

/**
 * The visible history: every message in the order it appeared, plus each chat error. Errors are
 * shown only here and never sent to the model. A message that `regenerate` removes from
 * `useChat` keeps a snapshot, so what was visible before the error stays on screen.
 */
export function useTranscript(messages: ChatUIMessage[], error: Error | undefined) {
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
          next = next.map((entry) => entry.type === 'message' && entry.id === failed.id
            ? { ...entry, snapshot: failed }
            : entry)
        }
        next.push(errorEntry)
      }

      return next
    })
  }, [messages, error])

  return transcript
}
