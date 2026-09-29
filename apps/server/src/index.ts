import { APP_NAME } from '@justcode/shared'
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.json({ message: `Welcome to ${APP_NAME}!` }))
app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
