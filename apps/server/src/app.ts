import { APP_NAME } from '@justcode/shared'
import { Hono } from 'hono'

const app = new Hono()
  .get('/', (c) => c.json({ message: `Welcome to ${APP_NAME}!` }))
  .get('/health', (c) => c.json({ status: 'ok' }))

export type AppType = typeof app

export default app
