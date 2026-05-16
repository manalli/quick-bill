import { z } from "zod"

const providerSchema = z.enum(["openai", "gemini"])

export type AiProvider = z.infer<typeof providerSchema>

function resolveProvider(): AiProvider {
  const explicit = process.env.AI_PROVIDER?.toLowerCase()
  if (explicit === "openai" || explicit === "gemini") return explicit
  if (process.env.OPENAI_API_KEY) return "openai"
  if (process.env.GEMINI_API_KEY) return "gemini"
  throw new Error(
    "No AI provider configured. Set OPENAI_API_KEY or GEMINI_API_KEY (and optionally AI_PROVIDER)."
  )
}

export function getAiConfig() {
  const provider = resolveProvider()

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error("OPENAI_API_KEY is required when AI_PROVIDER=openai")
    return {
      provider,
      apiKey,
      model: process.env.AI_MODEL ?? "gpt-4o-mini",
    } as const
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini")
  return {
    provider,
    apiKey,
    model: process.env.AI_MODEL ?? "gemini-2.0-flash",
  } as const
}

export function isAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY)
}
