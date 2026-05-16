import OpenAI from "openai"
import { getAiConfig } from "@/lib/env/ai"
import { withRetry } from "@/lib/ai/retry"

export type AiMessage = {
  system: string
  user: string
}

async function callOpenAI(messages: AiMessage, model: string, apiKey: string) {
  const client = new OpenAI({ apiKey, timeout: 45_000 })

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.35,
    max_tokens: 1200,
    messages: [
      { role: "system", content: messages.system },
      { role: "user", content: messages.user },
    ],
  })

  const text = completion.choices[0]?.message?.content?.trim()
  if (!text) throw new Error("OpenAI returned an empty response")
  return text
}

async function callGemini(messages: AiMessage, model: string, apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${messages.system}\n\n---\n\n${messages.user}` }],
        },
      ],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 1200,
      },
    }),
    signal: AbortSignal.timeout(45_000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Gemini API error ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
    error?: { message?: string }
  }

  if (data.error?.message) {
    throw new Error(data.error.message)
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw new Error("Gemini returned an empty response")
  return text
}

export async function generateAiText(messages: AiMessage) {
  const config = getAiConfig()

  return withRetry(async () => {
    if (config.provider === "openai") {
      return {
        text: await callOpenAI(messages, config.model, config.apiKey),
        provider: config.provider,
        model: config.model,
      }
    }
    return {
      text: await callGemini(messages, config.model, config.apiKey),
      provider: config.provider,
      model: config.model,
    }
  })
}
