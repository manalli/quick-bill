import "dotenv/config"
import { PrismaClient, Role } from "@prisma/client"
import { hashPassword } from "../lib/auth/password"
import { normalizeEmail } from "../lib/format"

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to run the seed script.")
  }

  if (process.env.NODE_ENV === "production" && !process.env.SEED_ADMIN_PASSWORD) {
    throw new Error(
      "Refusing to seed in production without SEED_ADMIN_PASSWORD (set explicitly when automating onboarding)."
    )
  }

  const prisma = new PrismaClient()
  try {
    const email = normalizeEmail(process.env.SEED_ADMIN_EMAIL ?? "admin@quickbill.local")
    const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme12345"

    let name = "Administrator"
    if (process.env.SEED_ADMIN_NAME !== undefined && process.env.SEED_ADMIN_NAME.trim().length > 0) {
      name = process.env.SEED_ADMIN_NAME.trim()
    }

    const passwordHash = await hashPassword(password)

    await prisma.user.upsert({
      where: { email },
      create: { email, name, passwordHash, role: Role.ADMIN },
      update: { name, passwordHash, role: Role.ADMIN },
    })

    console.log(`Seeded ADMIN user (${email}).`)
    console.info(
      "Tip: Rotate this password immediately in anything other than disposable development sandboxes."
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
