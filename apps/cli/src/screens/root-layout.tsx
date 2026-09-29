import { Outlet } from 'react-router'

export function RootLayout() {
  return (
    <box width="100%" height="100%" flexDirection="column">
      <Outlet />
    </box>
  )
}
