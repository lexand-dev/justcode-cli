// Type-only entry point, safe for any app (e.g. the CLI). Every export is erased at
// runtime, so importing it never pulls in PrismaClient, the pg adapter, or DATABASE_URL.
// Server code that queries the database imports `@justcode/db/client` instead.
// Note: these are database row shapes. Over HTTP, DateTime fields arrive as ISO strings.
export type { Message, MessageRole, Session } from '../generated/browser'
