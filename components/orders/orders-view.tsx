"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FileTextIcon } from "lucide-react"
import { getOrdersAction } from "@/lib/actions/orders"
import type { SerializedOrder } from "@/lib/orders/serialize"
import { orderListQuerySchema } from "@/lib/validations/order"
import { formatCurrency, formatDateTime } from "@/lib/format"
import { paymentMethodLabels } from "@/lib/orders/labels"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type ListData = {
  items: SerializedOrder[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

type Props = {
  initialData: ListData
  initialQuery: ReturnType<typeof orderListQuerySchema.parse>
}

export function OrdersView({ initialData, initialQuery }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState(initialData)
  const [query, setQuery] = useState(initialQuery)
  const [loading, startLoading] = useTransition()

  const fetchOrders = useCallback((nextQuery: typeof query) => {
    startLoading(async () => {
      const result = await getOrdersAction(nextQuery)
      if (result.success) {
        setData(result.data)
        setQuery(nextQuery)
      }
    })
  }, [])

  const syncUrl = (next: typeof query) => {
    const params = new URLSearchParams()
    if (next.page !== 1) params.set("page", String(next.page))
    if (next.status !== "all") params.set("status", next.status)
    if (next.search) params.set("search", next.search)
    const qs = params.toString()
    router.replace(qs ? `/dashboard/orders?${qs}` : "/dashboard/orders", { scroll: false })
  }

  const handleChange = (patch: Partial<typeof query>) => {
    const next = orderListQuerySchema.parse({ ...query, ...patch })
    syncUrl(next)
    fetchOrders(next)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      const urlSearch = searchParams.get("search") ?? ""
      if (query.search === urlSearch) return
      const next = orderListQuerySchema.parse({ ...query, search: urlSearch, page: 1 })
      syncUrl(next)
      fetchOrders(next)
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.search])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-muted-foreground text-sm">Completed sales and cancellations.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/pos">Open POS</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border bg-card/80 p-4 sm:flex-row">
        <Input
          placeholder="Search order #, customer…"
          className="sm:max-w-xs"
          value={query.search}
          disabled={loading}
          onChange={(e) => setQuery((q) => ({ ...q, search: e.target.value, page: 1 }))}
        />
        <select
          className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
          value={query.status}
          disabled={loading}
          onChange={(e) =>
            handleChange({
              status: e.target.value as typeof query.status,
              page: 1,
            })
          }
        >
          <option value="all">All statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Invoice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && data.items.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm">
                  No orders yet.{" "}
                  <Link href="/dashboard/pos" className="text-primary font-semibold underline">
                    Create a sale
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <p className="font-mono text-sm font-semibold">{order.orderNumber}</p>
                    <p className="text-muted-foreground text-xs">{formatDateTime(order.createdAt)}</p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {order.customerName ?? "Walk-in"}
                    {order.customerPhone && (
                      <p className="text-muted-foreground text-xs">{order.customerPhone}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{paymentMethodLabels[order.paymentMethod]}</TableCell>
                  <TableCell className="font-semibold tabular-nums">
                    {formatCurrency(order.total)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={order.status === "CANCELLED" ? "destructive" : "success"}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/orders/${order.id}/invoice`}>
                        <FileTextIcon className="size-3.5" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="border-border flex items-center justify-between border-t px-4 py-3">
          <p className="text-muted-foreground text-xs">
            Page {data.page} of {data.totalPages} · {data.total} orders
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={query.page <= 1 || loading}
              onClick={() => handleChange({ page: query.page - 1 })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={query.page >= data.totalPages || loading}
              onClick={() => handleChange({ page: query.page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
