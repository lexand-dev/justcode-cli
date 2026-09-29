import { SERVER_PORT } from '@justcode/shared'
import app from './app'

export default {
  port: SERVER_PORT,
  fetch: app.fetch,
}
