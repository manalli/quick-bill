import type { Metadata } from "next"
import { ReportsView } from "@/components/reports/reports-view"
import { getFilterOptions } from "@/lib/analytics/queries"
import { defaultAnalyticsFilters } from "@/lib/validations/analytics"

export const metadata: Metadata = {
  title: "Reports",
}

export default async function ReportsPage() {
  const filters = defaultAnalyticsFilters()
  const filterOptions = await getFilterOptions()

  return <ReportsView initialFilters={filters} filterOptions={filterOptions} />
}
