import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/client'

export * from '../generated/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('Set DATABASE_URL to use the database.')
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

// Reuse one client (and its connection pool) across `bun --hot` reloads.
export const prisma = globalForPrisma.prisma ?? createPrismaClient()
globalForPrisma.prisma = prisma
