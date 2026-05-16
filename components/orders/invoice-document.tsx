"use client"

import { useEffect } from "react"
import Link from "next/link"
import type { SerializedOrder } from "@/lib/orders/serialize"
import { formatCurrency, formatDateTime } from "@/lib/format"
import { paymentMethodLabels } from "@/lib/orders/labels"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Props = {
  order: SerializedOrder
  autoPrint?: boolean
  showActions?: boolean
  onCancel?: () => void
  cancelPending?: boolean
}

export function InvoiceDocument({
  order,
  autoPrint,
  showActions = true,
  onCancel,
  cancelPending,
}: Props) {
  useEffect(() => {
    if (autoPrint && order.status === "COMPLETED") {
      const t = setTimeout(() => window.print(), 400)
      return () => clearTimeout(t)
    }
  }, [autoPrint, order.status])

  return (
    <div className="invoice-root mx-auto max-w-2xl">
      {showActions && (
        <div className="no-print mb-6 flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => window.print()}>
            Print receipt
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/pos">New sale</Link>
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/orders">All orders</Link>
          </Button>
          {order.status === "COMPLETED" && onCancel && (
            <Button
              type="button"
              variant="destructive"
              disabled={cancelPending}
              onClick={onCancel}
            >
              {cancelPending ? "Cancelling…" : "Cancel order"}
            </Button>
          )}
        </div>
      )}

      <article className="invoice-paper rounded-lg border border-border bg-white p-8 text-black shadow-sm print:border-0 print:shadow-none">
        <header className="border-border flex items-start justify-between gap-4 border-b pb-6">
          <div>
            <p className="text-lg font-bold tracking-tight">QuickBill</p>
            <p className="text-sm text-neutral-600">Stationery & Electronics</p>
            <p className="mt-1 text-xs text-neutral-500">Tax invoice / Receipt</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-mono text-base font-bold">{order.orderNumber}</p>
            <p className="text-neutral-600">{formatDateTime(order.createdAt)}</p>
            <div className="mt-2 flex justify-end">
              <Badge
                variant={order.status === "CANCELLED" ? "destructive" : "success"}
                className="print:border print:border-neutral-400"
              >
                {order.status}
              </Badge>
            </div>
          </div>
        </header>

        {(order.customerName || order.customerPhone) && (
          <section className="border-border border-b py-4 text-sm">
            <p className="font-semibold text-neutral-800">Bill to</p>
            {order.customerName && <p>{order.customerName}</p>}
            {order.customerPhone && <p className="text-neutral-600">{order.customerPhone}</p>}
          </section>
        )}

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-border border-b text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="pb-2 font-semibold">Item</th>
              <th className="pb-2 text-right font-semibold">Qty</th>
              <th className="pb-2 text-right font-semibold">Rate</th>
              <th className="pb-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-border border-b border-dashed">
                <td className="py-3 pr-2">
                  <p className="font-medium">{item.productName}</p>
                  <p className="font-mono text-[10px] text-neutral-500">{item.productSku}</p>
                </td>
                <td className="py-3 text-right tabular-nums">{item.quantity}</td>
                <td className="py-3 text-right tabular-nums">{formatCurrency(item.unitPrice)}</td>
                <td className="py-3 text-right font-medium tabular-nums">
                  {formatCurrency(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="mt-6 ml-auto w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-600">Subtotal</span>
            <span className="tabular-nums">{formatCurrency(order.subtotal)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-800">
              <span>Discount</span>
              <span className="tabular-nums">−{formatCurrency(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-neutral-600">Tax ({order.taxRate}%)</span>
            <span className="tabular-nums">{formatCurrency(order.taxAmount)}</span>
          </div>
          <div className="border-border flex justify-between border-t pt-2 text-base font-bold">
            <span>Total paid</span>
            <span className="tabular-nums">{formatCurrency(order.total)}</span>
          </div>
          <p className="text-neutral-600 pt-1 text-right text-xs">
            Payment: {paymentMethodLabels[order.paymentMethod]}
          </p>
        </section>

        {order.notes && (
          <p className="mt-4 text-xs text-neutral-600">
            <span className="font-semibold">Note:</span> {order.notes}
          </p>
        )}

        {order.status === "CANCELLED" && (
          <div className="mt-6 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900">
            <p className="font-semibold">Cancelled</p>
            {order.cancelledAt && (
              <p className="text-xs">{formatDateTime(order.cancelledAt)}</p>
            )}
            {order.cancelReason && <p className="mt-1">{order.cancelReason}</p>}
          </div>
        )}

        <footer className="border-border mt-8 border-t pt-4 text-center text-xs text-neutral-500">
          <p>Thank you for shopping with us.</p>
          <p className="mt-1">Prices on this invoice are historical and locked at time of sale.</p>
          <p className="mt-1">Served by {order.createdBy.name ?? order.createdBy.email}</p>
        </footer>
      </article>

    </div>
  )
}
