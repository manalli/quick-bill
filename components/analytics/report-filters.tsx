"use client"

import { FilterIcon } from "lucide-react"
import type { AnalyticsFilters } from "@/lib/validations/analytics"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

const selectClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-inner outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35"

type FilterOptions = {
  categories: string[]
  cashiers: { id: string; label: string }[]
}

type Props = {
  filters: AnalyticsFilters
  options: FilterOptions
  loading?: boolean
  onChange: (patch: Partial<AnalyticsFilters>) => void
  onApply: () => void
}

export function ReportFilters({
  filters,
  options,
  loading,
  onChange,
  onApply,
}: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <FilterIcon className="text-muted-foreground size-4" aria-hidden />
        <h2 className="text-sm font-semibold tracking-tight">Filters</h2>
        <span className="text-destructive text-xs font-medium">Date range required</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2">
          <Label htmlFor="dateFrom">From *</Label>
          <input
            id="dateFrom"
            type="date"
            className={selectClass}
            value={filters.dateFrom}
            disabled={loading}
            onChange={(e) => onChange({ dateFrom: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateTo">To *</Label>
          <input
            id="dateTo"
            type="date"
            className={selectClass}
            value={filters.dateTo}
            disabled={loading}
            onChange={(e) => onChange({ dateTo: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            className={selectClass}
            value={filters.category}
            disabled={loading}
            onChange={(e) => onChange({ category: e.target.value })}
          >
            <option value="">All categories</option>
            {options.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cashier">Cashier</Label>
          <select
            id="cashier"
            className={selectClass}
            value={filters.cashierId}
            disabled={loading}
            onChange={(e) => onChange({ cashierId: e.target.value })}
          >
            <option value="">All cashiers</option>
            {options.cashiers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            className="h-11 w-full"
            disabled={loading || !filters.dateFrom || !filters.dateTo}
            onClick={onApply}
          >
            Apply filters
          </Button>
        </div>
      </div>
    </div>
  )
}
