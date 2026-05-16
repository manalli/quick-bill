import type { DailySummaryContext, RestockContext } from "@/lib/ai/context"

export const DAILY_SUMMARY_SYSTEM = `You are QuickBill's retail operations assistant for a stationery and electronics shop owner (non-technical).
Write a concise morning briefing in plain English (2-4 short sentences).
Be specific with numbers and percentages from the data. Mention low stock only if relevant.
Do not invent data. Do not use markdown headings or bullet lists — flowing prose only.`

export function buildDailySummaryUserPrompt(ctx: DailySummaryContext) {
  return `Analyze this POS data and write today's briefing:

${JSON.stringify(ctx, null, 2)}`
}

export const RESTOCK_SYSTEM = `You are QuickBill's inventory planner for a retail shop.
Given product stock levels and sales velocity, suggest practical restock quantities.
Respond with valid JSON only (no markdown fences), matching this schema:
{
  "overview": "1-2 sentences for the shop owner",
  "suggestions": [
    {
      "productId": "string (from data)",
      "productName": "string",
      "sku": "string",
      "suggestedQty": number (integer >= 1),
      "priority": "high" | "medium" | "low",
      "reason": "short plain-English reason citing velocity/stock"
    }
  ]
}
Include only products that genuinely need restocking (max 12 items). suggestedQty should cover ~7-14 days of demand based on velocity when possible.`

export function buildRestockUserPrompt(ctx: RestockContext) {
  return `Restock analysis input:

${JSON.stringify(ctx, null, 2)}`
}
