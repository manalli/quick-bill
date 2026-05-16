import { getDailySummaryContext, getRestockContext } from "@/lib/ai/context"
import { generateAiText } from "@/lib/ai/generate"
import { parseRestockResponse } from "@/lib/ai/parse"
import {
  buildDailySummaryUserPrompt,
  buildRestockUserPrompt,
  DAILY_SUMMARY_SYSTEM,
  RESTOCK_SYSTEM,
} from "@/lib/ai/prompts"
import { isAiConfigured } from "@/lib/env/ai"

export class AiServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_CONFIGURED" | "GENERATION_FAILED" | "PARSE_FAILED"
  ) {
    super(message)
    this.name = "AiServiceError"
  }
}

export async function produceDailySummary() {
  if (!isAiConfigured()) {
    throw new AiServiceError(
      "AI is not configured. Add OPENAI_API_KEY or GEMINI_API_KEY to your environment.",
      "NOT_CONFIGURED"
    )
  }

  const context = await getDailySummaryContext()

  try {
    const { text, provider, model } = await generateAiText({
      system: DAILY_SUMMARY_SYSTEM,
      user: buildDailySummaryUserPrompt(context),
    })

    return {
      summary: text,
      context,
      meta: {
        provider,
        model,
        generatedAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error("[ai/daily-summary]", error)
    throw new AiServiceError(
      error instanceof Error ? error.message : "Failed to generate daily summary",
      "GENERATION_FAILED"
    )
  }
}

export async function produceRestockSuggestions() {
  if (!isAiConfigured()) {
    throw new AiServiceError(
      "AI is not configured. Add OPENAI_API_KEY or GEMINI_API_KEY to your environment.",
      "NOT_CONFIGURED"
    )
  }

  const context = await getRestockContext()

  try {
    const { text, provider, model } = await generateAiText({
      system: RESTOCK_SYSTEM,
      user: buildRestockUserPrompt(context),
    })

    let parsed
    try {
      parsed = parseRestockResponse(text)
    } catch (parseError) {
      console.error("[ai/restock] parse failed", parseError, text)
      throw new AiServiceError(
        "AI returned an invalid format. Please try again.",
        "PARSE_FAILED"
      )
    }

    const validIds = new Set(context.priorityProducts.map((p) => p.id))
    const suggestions = parsed.suggestions.filter((s) => validIds.has(s.productId))

    return {
      overview: parsed.overview,
      suggestions,
      context: {
        lowStockCount: context.lowStockCount,
        outOfStockCount: context.outOfStockCount,
        productCount: context.productCount,
      },
      meta: {
        provider,
        model,
        generatedAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    if (error instanceof AiServiceError) throw error
    console.error("[ai/restock]", error)
    throw new AiServiceError(
      error instanceof Error ? error.message : "Failed to generate restock suggestions",
      "GENERATION_FAILED"
    )
  }
}
