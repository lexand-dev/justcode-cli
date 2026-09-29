import { createMemoryRouter } from 'react-router'
import { AboutScreen } from './screens/about-screen'
import { HomeScreen } from './screens/home-screen'
import { NotFoundScreen } from './screens/not-found-screen'
import { RootLayout } from './screens/root-layout'
import { SettingsScreen } from './screens/settings-screen'

export const router = createMemoryRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: 'about', element: <AboutScreen /> },
      { path: 'settings', element: <SettingsScreen /> },
      { path: '*', element: <NotFoundScreen /> },
    ],
  },
])
