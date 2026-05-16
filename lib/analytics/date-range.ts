import { endOfDay, startOfDay } from "date-fns"
import type { AnalyticsFilters } from "@/lib/validations/analytics"

export function toDateRange(filters: AnalyticsFilters) {
  const from = startOfDay(new Date(filters.dateFrom))
  const to = endOfDay(new Date(filters.dateTo))
  return { from, to }
}

export function todayRange() {
  const now = new Date()
  return { from: startOfDay(now), to: endOfDay(now) }
}
