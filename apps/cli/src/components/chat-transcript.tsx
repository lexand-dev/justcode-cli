import type { ChatUIMessage } from '@justcode/tools'
import type { TranscriptEntry } from '../hooks/use-transcript'
import { ChatError, ChatMessage } from './chat-message'

/** Renders the transcript; messages show their live `useChat` version, or their snapshot once removed. */
export function ChatTranscript({
  entries,
  messages,
  retryAvailable,
}: {
  entries: TranscriptEntry[]
  messages: ChatUIMessage[]
  /** Whether the latest error can be retried (the chat is in its error state). */
  retryAvailable: boolean
}) {
  const currentMessages = new Map(messages.map((message) => [message.id, message]))
  const latestError = entries.findLast((entry) => entry.type === 'error')

  return entries.map((entry) => {
    if (entry.type === 'error') {
      return (
        <ChatError
          key={entry.id}
          message={entry.text}
          retryAvailable={retryAvailable && entry.id === latestError?.id}
        />
      )
    }

    const message = currentMessages.get(entry.id) ?? entry.snapshot
    return message ? <ChatMessage key={entry.id} message={message} /> : null
  })
}
