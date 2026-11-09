import { useState } from 'react'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { AsciiArt } from '../components/ascii-art'
import { ChatTextarea } from '../components/chat-textarea'
import { ServerStatus } from '../components/server-status'
import { client } from '../lib/client'

const createdSessionSchema = z.object({ id: z.uuid() })

type StartState =
  | { status: 'idle' }
  | { status: 'creating' }
  | { status: 'error'; error: string; draft: string; attempt: number }

export function HomeScreen() {
  const navigate = useNavigate()
  const [state, setState] = useState<StartState>({ status: 'idle' })

  async function startSession(message: string) {
    setState({ status: 'creating' })
    try {
      const response = await client.sessions.$post()
      if (!response.ok) throw new Error(`Could not create a session (HTTP ${response.status}).`)

      const session = createdSessionSchema.safeParse(await response.json())
      if (!session.success) throw new Error('Unexpected response while creating a session.')

      void navigate(`/sessions/${session.data.id}`, { state: { message } })
    } catch (error) {
      setState((previous) => ({
        status: 'error',
        error: error instanceof Error ? error.message : 'Could not create a session.',
        draft: message,
        attempt: previous.status === 'error' ? previous.attempt + 1 : 1,
      }))
    }
  }

  return (
    <box alignItems="center" justifyContent="center" flexGrow={1}>
      <box flexDirection="column" alignItems="center" gap={1} width="90%" maxWidth={64}>
        <AsciiArt />
        <ServerStatus />
        <ChatTextarea
          // Remount with the unsent text after a failure: the textarea clears itself on submit.
          key={state.status === 'error' ? state.attempt : 0}
          initialValue={state.status === 'error' ? state.draft : undefined}
          disabled={state.status === 'creating'}
          placeholder="Enter a message: Enter to chat, Shift+Enter for a new line"
          onSend={(message) => { void startSession(message) }}
        />
        {state.status === 'creating' ? <text>Creating session...</text> : null}
        {state.status === 'error' ? <text>Error: {state.error}</text> : null}
      </box>
    </box>
  )
}
