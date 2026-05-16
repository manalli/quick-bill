import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/db/prisma"
import { getServerEnv } from "@/lib/env/server"
import { normalizeEmail } from "@/lib/format"
import { verifyPassword } from "@/lib/auth/password"

export const authOptions: NextAuthOptions = {
  secret: getServerEnv().NEXTAUTH_SECRET,

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const emailRaw = creds?.email
        const password = creds?.password
        if (
          typeof emailRaw !== "string" ||
          typeof password !== "string" ||
          !emailRaw.trim() ||
          !password
        ) {
          return null
        }

        const email = normalizeEmail(emailRaw)
        const user = await prisma.user.findUnique({ where: { email } })

        if (!user) return null

        const valid = await verifyPassword(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email ?? undefined
        token.name = user.name ? user.name : undefined
        token.role = user.role
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role!
        session.user.email = token.email as string
        session.user.name = token.name ?? null
      }
      return session
    },
  },
}
