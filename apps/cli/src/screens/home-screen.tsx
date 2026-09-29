import { AsciiArt } from '../components/ascii-art'
import { HomeTextarea } from '../components/home-textarea'

export function HomeScreen() {
  return (
    <box alignItems="center" justifyContent="center" flexGrow={1}>
      <box flexDirection="column" alignItems="center" gap={1} width="90%" maxWidth={64}>
        <AsciiArt />
        <HomeTextarea />
      </box>
    </box>
  )
}
