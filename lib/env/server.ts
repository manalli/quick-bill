// import { z } from "zod"

// const schema = z.object({
//   DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
//   NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
//   NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
// })

// export type ServerEnv = z.infer<typeof schema>

// let cached: ServerEnv | null = null

// /**
//  * Validates required server environment variables. Call only from Node.js server code,
//  * Route Handlers, Server Actions, and Prisma scripts — not from Edge Middleware.
//  */
// export function getServerEnv(): ServerEnv {
//   if (!cached) {
//     const parsed = schema.safeParse(process.env)
//     if (!parsed.success) {
//       console.error(parsed.error.flatten().fieldErrors)
//       throw new Error("Invalid server environment variables")
//     }
//     cached = parsed.data
//   }
//   return cached
// }


export function getServerEnv() {
  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL!,
  }
}