import { SERVER_PORT } from '@justcode/shared'
import type { AppType } from '@justcode/server/app'
import { hc } from 'hono/client'

export const client = hc<AppType>(`http://localhost:${SERVER_PORT}`)
