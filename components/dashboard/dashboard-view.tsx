"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import Link from "next/link"
import {
  AlertTriangleIcon,
  DollarSignIcon,
  PackageIcon,
  ShoppingCartIcon,
  TrendingUpIcon,
  WarehouseIcon,
} from "lucide-react"
import {
  getAnalyticsFilterOptionsAction,
  getDashboardAnalyticsAction,
} from "@/lib/actions/analytics"
import type { DashboardAnalytics } from "@/lib/analytics/queries"
import {
  defaultAnalyticsFilters,
  type AnalyticsFilters,
} from "@/lib/validations/analytics"
import { formatCurrency, formatDateTime } from "@/lib/format"
import { DailySummaryCard } from "@/components/ai/daily-summary-card"
import { RestockSuggestionsCard } from "@/components/ai/restock-suggestions-card"
import { ReportFilters } from "@/components/analytics/report-filters"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { DashboardCharts } from "@/components/dashboard/dashboard-charts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Props = {
  initialData: DashboardAnalytics
  initialFilters: AnalyticsFilters
  filterOptions: {
    categories: string[]
    cashiers: { id: string; label: string }[]
  }
}

export function DashboardView({
  initialData,
  initialFilters,
  filterOptions: initialOptions,
}: Props) {
  const [data, setData] = useState(initialData)
  const [filters, setFilters] = useState(initialFilters)
  const [draft, setDraft] = useState(initialFilters)
  const [options, setOptions] = useState(initialOptions)
  const [loading, startLoading] = useTransition()

  const refresh = useCallback((next: AnalyticsFilters) => {
    startLoading(async () => {
      const result = await getDashboardAnalyticsAction(next)
      if (result.success) {
        setData(result.data)
        setFilters(next)
      }
    })
  }, [])

  useEffect(() => {
    getAnalyticsFilterOptionsAction().then((r) => {
      if (r.success) setOptions(r.data)
    })
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Business dashboard
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            Morning briefing for Meera — today at a glance, trends and stock alerts for the
            selected period.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/reports">Open reports</Link>
        </Button>
      </div>

      <ReportFilters
        filters={draft}
        options={options}
        loading={loading}
        onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
        onApply={() => refresh(draft)}
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <DailySummaryCard />
        <RestockSuggestionsCard />
      </section>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Today's sales"
              value={String(data.today.orders)}
              hint={`Revenue ${formatCurrency(data.today.revenue)}`}
              icon={ShoppingCartIcon}
              tone="sky"
            />
            <KpiCard
              title="Period revenue"
              value={formatCurrency(data.period.revenue)}
              hint={`${filters.dateFrom} → ${filters.dateTo}`}
              icon={DollarSignIcon}
              tone="emerald"
            />
            <KpiCard
              title="Period orders"
              value={String(data.period.orders)}
              hint={`Discounts ${formatCurrency(data.period.discounts)}`}
              icon={TrendingUpIcon}
            />
            <KpiCard
              title="Est. profit"
              value={formatCurrency(data.period.profit)}
              hint="Line revenue minus current product cost"
              icon={TrendingUpIcon}
              tone="emerald"
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <KpiCard
              title="Inventory valuation (cost)"
              value={formatCurrency(data.inventory.costValue)}
              hint={`${data.inventory.skuCount} SKUs on hand`}
              icon={WarehouseIcon}
            />
            <KpiCard
              title="Inventory valuation (retail)"
              value={formatCurrency(data.inventory.retailValue)}
              hint="Stock × selling price"
              icon={PackageIcon}
              tone="sky"
            />
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangleIcon className="mt-0.5 size-5 text-amber-700 dark:text-amber-300" />
                <div>
                  <h3 className="font-semibold">Low stock alerts</h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {data.lowStock.length === 0
                      ? "All tracked items are above their thresholds."
                      : `${data.lowStock.length} products need restocking attention.`}
                  </p>
                  {data.lowStock.length > 0 && (
                    <Button variant="link" className="mt-2 h-auto p-0" asChild>
                      <Link href="/dashboard/products">View catalogue</Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </section>

          <DashboardCharts data={data} />

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-border border-b px-5 py-4">
                <h3 className="font-semibold">Top products</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground py-8 text-center text-sm">
                        No sales in this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.topProducts.map((p) => (
                      <TableRow key={p.productId}>
                        <TableCell>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-muted-foreground font-mono text-[10px]">{p.sku}</p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{p.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatCurrency(p.revenue)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-border border-b px-5 py-4">
                <h3 className="font-semibold">Recent orders</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/orders/${o.id}/invoice`}
                          className="font-mono text-sm font-semibold hover:underline"
                        >
                          {o.orderNumber}
                        </Link>
                        <p className="text-muted-foreground text-[10px]">
                          {formatDateTime(o.createdAt)}
                        </p>
                      </TableCell>
                      <TableCell className="tabular-nums font-medium">
                        {formatCurrency(o.total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={o.status === "CANCELLED" ? "destructive" : "success"}>
                          {o.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {data.lowStock.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-4 font-semibold">Restock soon</h3>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {data.lowStock.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                  >
                    <span className="truncate font-medium">{p.name}</span>
                    <Badge variant="warning">
                      {p.stockQuantity} / {p.lowStockThreshold}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
