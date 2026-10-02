import type { ReactNode } from 'react'

export function ChatShell({ children, composer }: { children: ReactNode; composer: ReactNode }) {
  return (
    <box flexDirection="column" flexGrow={1} height="100%" padding={1} gap={1}>
      <scrollbox flexGrow={1} flexShrink={1} minHeight={1} stickyScroll stickyStart="bottom">
        {children}
      </scrollbox>
      <box width="100%" flexShrink={0}>{composer}</box>
    </box>
  )
}
