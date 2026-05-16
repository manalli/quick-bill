"use server"

import { getRequiredSession } from "@/lib/auth/session"
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/actions/utils"
import {
  getDashboardAnalytics,
  getFilterOptions,
  getInventoryReport,
  getProfitReport,
  getSalesReport,
} from "@/lib/analytics/queries"
import {
  analyticsFiltersSchema,
  type AnalyticsFilters,
  type ReportType,
} from "@/lib/validations/analytics"

export async function getDashboardAnalyticsAction(
  raw: unknown
): Promise<ActionResult<Awaited<ReturnType<typeof getDashboardAnalytics>>>> {
  try {
    await getRequiredSession()
    const filters = analyticsFiltersSchema.parse(raw)
    const data = await getDashboardAnalytics(filters)
    return actionSuccess(data)
  } catch {
    return actionError("Failed to load dashboard analytics.")
  }
}

export async function getAnalyticsFilterOptionsAction() {
  try {
    await getRequiredSession()
    const data = await getFilterOptions()
    return actionSuccess(data)
  } catch {
    return actionError("Failed to load filter options.")
  }
}

export async function getReportDataAction(
  type: ReportType,
  raw: unknown
) {
  try {
    await getRequiredSession()
    const filters = analyticsFiltersSchema.parse(raw)

    if (type === "sales") {
      return actionSuccess(await getSalesReport(filters))
    }
    if (type === "inventory") {
      return actionSuccess(await getInventoryReport(filters))
    }
    return actionSuccess(await getProfitReport(filters))
  } catch {
    return actionError("Failed to load report data.")
  }
}
