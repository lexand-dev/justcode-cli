import { createMemoryRouter, Outlet } from 'react-router'
import { AgentModeProvider } from './hooks/use-agent-mode'
import { ChatScreen } from './screens/chat-screen'
import { HomeScreen } from './screens/home-screen'

export const router = createMemoryRouter([
  {
    element: (
      <AgentModeProvider>
        <Outlet />
      </AgentModeProvider>
    ),
    children: [
      { path: '/', element: <HomeScreen /> },
      { path: '/sessions/:sessionId', element: <ChatScreen /> },
    ],
  },
])
