import { z } from "zod"

const restockSuggestionSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  sku: z.string(),
  suggestedQty: z.coerce.number().int().positive(),
  priority: z.enum(["high", "medium", "low"]),
  reason: z.string().min(1),
})

export const restockResponseSchema = z.object({
  overview: z.string().min(1),
  suggestions: z.array(restockSuggestionSchema).max(12),
})

export type RestockAiResponse = z.infer<typeof restockResponseSchema>

export function extractJsonObject(text: string) {
  const trimmed = text.trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence?.[1]) return fence[1].trim()

  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1)
  }
  return trimmed
}

export function parseRestockResponse(text: string) {
  const raw = extractJsonObject(text)
  const parsed = JSON.parse(raw) as unknown
  return restockResponseSchema.parse(parsed)
}
