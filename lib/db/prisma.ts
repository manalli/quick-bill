import { PrismaClient } from "@prisma/client"
import { getServerEnv } from "@/lib/env/server"

const prismaGlobal = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient() {
  getServerEnv()
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  })
}

/** Prisma client for server-side usage only (never import into Edge Middleware). */
export const prisma = prismaGlobal.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  prismaGlobal.prisma = prisma
}
