import { useNavigate } from 'react-router'
import { AsciiArt } from '../components/ascii-art'
import { ChatTextarea } from '../components/chat-textarea'
import { ServerStatus } from '../components/server-status'

export function HomeScreen() {
  const navigate = useNavigate()

  return (
    <box alignItems="center" justifyContent="center" flexGrow={1}>
      <box flexDirection="column" alignItems="center" gap={1} width="90%" maxWidth={64}>
        <AsciiArt />
        <ServerStatus />
        <ChatTextarea
          placeholder="Enter a message: Enter to chat, Shift+Enter for a new line"
          onSend={(message) => { void navigate('/chat', { state: { message } }) }}
        />
      </box>
    </box>
  )
}
