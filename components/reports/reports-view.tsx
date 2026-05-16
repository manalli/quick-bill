"use client"

import { useState, useTransition } from "react"
import { DownloadIcon } from "lucide-react"
import {
  getReportDataAction,
} from "@/lib/actions/analytics"
import type { AnalyticsFilters, ReportType } from "@/lib/validations/analytics"
import { formatCurrency, formatDateTime } from "@/lib/format"
import { ReportFilters } from "@/components/analytics/report-filters"
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
import { toast } from "@/lib/toasts"

type FilterOptions = {
  categories: string[]
  cashiers: { id: string; label: string }[]
}

type Props = {
  initialFilters: AnalyticsFilters
  filterOptions: FilterOptions
}

const tabs: { id: ReportType; label: string }[] = [
  { id: "sales", label: "Sales" },
  { id: "inventory", label: "Inventory" },
  { id: "profit", label: "Profit" },
]

export function ReportsView({ initialFilters, filterOptions }: Props) {
  const [activeTab, setActiveTab] = useState<ReportType>("sales")
  const [filters, setFilters] = useState(initialFilters)
  const [draft, setDraft] = useState(initialFilters)
  const [rows, setRows] = useState<unknown[] | null>(null)
  const [loading, startLoading] = useTransition()
  const [exporting, setExporting] = useState(false)

  function loadReport(type: ReportType, f: AnalyticsFilters) {
    startLoading(async () => {
      const result = await getReportDataAction(type, f)
      if (result.success) {
        setRows(result.data as unknown[])
        setFilters(f)
      } else {
        toast.error(result.error)
      }
    })
  }

  function applyFilters() {
    loadReport(activeTab, draft)
  }

  async function exportExcel() {
    setExporting(true)
    try {
      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeTab, filters }),
      })

      if (!res.ok) {
        toast.error("Export failed.")
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `quickbill-${activeTab}-${filters.dateFrom}-to-${filters.dateTo}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Excel file downloaded.")
    } catch {
      toast.error("Export failed.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Reports</h1>
        <p className="text-muted-foreground text-sm">
          Sales, inventory, and profit exports respect the filters below.
        </p>
      </div>

      <ReportFilters
        filters={draft}
        options={filterOptions}
        loading={loading}
        onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
        onApply={applyFilters}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              variant={activeTab === tab.id ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveTab(tab.id)
                setRows(null)
              }}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          className="gap-2"
          disabled={exporting || !rows}
          onClick={exportExcel}
        >
          <DownloadIcon className="size-4" />
          {exporting ? "Exporting…" : "Export Excel"}
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        {loading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows === null ? (
          <p className="text-muted-foreground p-12 text-center text-sm">
            Choose filters and click Apply to load the {activeTab} report.
          </p>
        ) : activeTab === "sales" ? (
          <SalesTable rows={rows as SalesRow[]} />
        ) : activeTab === "inventory" ? (
          <InventoryTable rows={rows as InventoryRow[]} />
        ) : (
          <ProfitTable rows={rows as ProfitRow[]} />
        )}
      </div>
    </div>
  )
}

type SalesRow = {
  orderNumber: string
  date: Date
  customer: string
  cashier: string
  payment: string
  subtotal: number
  discount: number
  tax: number
  total: number
}

function SalesTable({ rows }: { rows: SalesRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Cashier</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.orderNumber + String(r.date)}>
            <TableCell className="font-mono text-sm">{r.orderNumber}</TableCell>
            <TableCell className="text-xs whitespace-nowrap">
              {formatDateTime(new Date(r.date).toISOString())}
            </TableCell>
            <TableCell>{r.customer}</TableCell>
            <TableCell className="text-xs">{r.cashier}</TableCell>
            <TableCell>{r.payment}</TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {formatCurrency(r.total)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

type InventoryRow = {
  sku: string
  name: string
  category: string
  stock: number
  lowThreshold: number
  costPrice: number
  sellPrice: number
  costValue: number
  retailValue: number
  status: string
}

function InventoryTable({ rows }: { rows: InventoryRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Stock</TableHead>
          <TableHead className="text-right">Cost value</TableHead>
          <TableHead className="text-right">Retail value</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.sku}>
            <TableCell className="font-mono text-xs">{r.sku}</TableCell>
            <TableCell className="font-medium">{r.name}</TableCell>
            <TableCell>{r.category}</TableCell>
            <TableCell className="text-right tabular-nums">{r.stock}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(r.costValue)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(r.retailValue)}
            </TableCell>
            <TableCell>{r.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

type ProfitRow = {
  orderNumber: string
  date: Date
  cashier: string
  sku: string
  name: string
  category: string
  quantity: number
  revenue: number
  cost: number
  profit: number
}

function ProfitTable({ rows }: { rows: ProfitRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Product</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
          <TableHead className="text-right">Cost</TableHead>
          <TableHead className="text-right">Profit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={`${r.orderNumber}-${i}`}>
            <TableCell className="font-mono text-xs">{r.orderNumber}</TableCell>
            <TableCell>
              <p className="font-medium">{r.name}</p>
              <p className="text-muted-foreground text-[10px]">{r.category}</p>
            </TableCell>
            <TableCell className="text-right tabular-nums">{r.quantity}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(r.revenue)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(r.cost)}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
              {formatCurrency(r.profit)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
