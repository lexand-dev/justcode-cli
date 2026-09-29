import { AsciiArt } from '../components/ascii-art'
import { HomeTextarea } from '../components/home-textarea'
import { ServerStatus } from '../components/server-status'

export function HomeScreen() {
  return (
    <box alignItems="center" justifyContent="center" flexGrow={1}>
      <box flexDirection="column" alignItems="center" gap={1} width="90%" maxWidth={64}>
        <AsciiArt />
        <ServerStatus />
        <HomeTextarea />
      </box>
    </box>
  )
}
