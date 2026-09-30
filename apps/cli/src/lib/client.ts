import type { AppType } from '@justcode/server/app'
import { hc } from 'hono/client'

export const client = hc<AppType>(`http://localhost:${Number(process.env.PORT ?? 3000)}`)
