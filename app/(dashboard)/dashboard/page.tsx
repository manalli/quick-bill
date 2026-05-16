import type { Metadata } from "next"
import { DashboardView } from "@/components/dashboard/dashboard-view"
import {
  getDashboardAnalytics,
  getFilterOptions,
} from "@/lib/analytics/queries"
import { defaultAnalyticsFilters } from "@/lib/validations/analytics"

export const metadata: Metadata = {
  title: "Dashboard",
}

export default async function DashboardPage() {
  const filters = defaultAnalyticsFilters()

  const [data, filterOptions] = await Promise.all([
    getDashboardAnalytics(filters),
    getFilterOptions(),
  ])

  return (
    <DashboardView
      initialData={data}
      initialFilters={filters}
      filterOptions={filterOptions}
    />
  )
}
