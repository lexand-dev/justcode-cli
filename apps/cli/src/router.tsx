import { createMemoryRouter } from 'react-router'
import { ChatScreen } from './screens/chat-screen'
import { HomeScreen } from './screens/home-screen'

export const router = createMemoryRouter([
  { path: '/', element: <HomeScreen /> },
  { path: '/chat', element: <ChatScreen /> },
])
