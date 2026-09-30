import { useCompletion } from '@ai-sdk/react'
import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { z } from 'zod'
import { client } from '../lib/client'

const chatStateSchema = z.object({ message: z.string().refine((message) => message.trim().length > 0) })

export function ChatScreen() {
  const { state, key } = useLocation()
  const chatState = chatStateSchema.safeParse(state)
  const prompt = chatState.success ? chatState.data.message : null
  const { complete, completion, error, isLoading, stop } = useCompletion({
    api: client.generate.$url().toString(),
  })

  useEffect(() => {
    if (prompt === null) return

    void complete(prompt, {
      body: {
        messages: [{ id: crypto.randomUUID(), role: 'user', parts: [{ type: 'text', text: prompt }] }],
      },
    })

    return stop
  }, [complete, key, prompt, stop])

  return (
    <box flexDirection="column" gap={1}>
      <text>{prompt ?? ''}</text>
      <text>{completion || (isLoading ? 'Generating...' : '')}</text>
      {error ? <text>Failed to generate: {error.message}</text> : null}
    </box>
  )
}
