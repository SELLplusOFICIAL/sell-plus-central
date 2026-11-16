import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Sin log de queries: en producción solo ruido y trabajo extra por consulta.
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db