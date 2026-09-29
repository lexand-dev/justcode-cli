/** @jsxImportSource @opentui/react */
import { createCliRenderer } from '@opentui/core'
import { createRoot } from '@opentui/react'
import { HomeScreen } from './screens/home-screen'

const renderer = await createCliRenderer()
createRoot(renderer).render(<HomeScreen />)
