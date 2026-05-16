import { z } from "zod"

function parseDateInput(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

export const analyticsFiltersSchema = z
  .object({
    dateFrom: z.string().min(1, "Start date is required"),
    dateTo: z.string().min(1, "End date is required"),
    category: z.string().trim().optional().default(""),
    cashierId: z.string().trim().optional().default(""),
  })
  .superRefine((data, ctx) => {
    const from = parseDateInput(data.dateFrom)
    const to = parseDateInput(data.dateTo)
    if (!from) {
      ctx.addIssue({ code: "custom", message: "Invalid start date", path: ["dateFrom"] })
    }
    if (!to) {
      ctx.addIssue({ code: "custom", message: "Invalid end date", path: ["dateTo"] })
    }
    if (from && to && from > to) {
      ctx.addIssue({
        code: "custom",
        message: "Start date must be before end date",
        path: ["dateTo"],
      })
    }
  })

export type AnalyticsFilters = z.infer<typeof analyticsFiltersSchema>

export const reportTypeSchema = z.enum(["sales", "inventory", "profit"])

export type ReportType = z.infer<typeof reportTypeSchema>

export function defaultAnalyticsFilters(): AnalyticsFilters {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 29)
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
    category: "",
    cashierId: "",
  }
}
