"use client"

import { useEffect, useState, useTransition } from "react"
import { HistoryIcon, PackagePlusIcon, SlidersHorizontalIcon } from "lucide-react"
import { adjustStockAction, restockProductAction } from "@/lib/actions/inventory"
import { getStockHistoryAction } from "@/lib/actions/products"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDateTime } from "@/lib/format"
import type { SerializedMovement, SerializedProduct } from "@/lib/products/serialize"
import { movementTypeLabels } from "@/lib/validations/product"
import { toast } from "@/lib/toasts"
import { StockBadge } from "@/components/products/stock-badge"
import { cn } from "@/lib/utils"

type Tab = "restock" | "adjust" | "history"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: SerializedProduct | null
  onSuccess: () => void
}

export function InventoryDialog({ open, onOpenChange, product, onSuccess }: Props) {
  const [tab, setTab] = useState<Tab>("restock")
  const [restockQty, setRestockQty] = useState("")
  const [restockReason, setRestockReason] = useState("")
  const [newQuantity, setNewQuantity] = useState("")
  const [adjustReason, setAdjustReason] = useState("")
  const [history, setHistory] = useState<SerializedMovement[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotalPages, setHistoryTotalPages] = useState(1)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (open && product) {
      setTab("restock")
      setRestockQty("")
      setRestockReason("")
      setNewQuantity(String(product.stockQuantity))
      setAdjustReason("")
      setHistoryPage(1)
    }
  }, [open, product])

  useEffect(() => {
    if (!open || !product || tab !== "history") return

    let cancelled = false
    setHistoryLoading(true)

    getStockHistoryAction({
      productId: product.id,
      page: historyPage,
      pageSize: 8,
    }).then((result) => {
      if (cancelled) return
      if (result.success) {
        setHistory(result.data.items)
        setHistoryTotalPages(result.data.totalPages)
      } else {
        toast.error(result.error)
      }
      setHistoryLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [open, product, tab, historyPage])

  function handleRestock(e: React.FormEvent) {
    e.preventDefault()
    if (!product) return

    startTransition(async () => {
      const result = await restockProductAction({
        productId: product.id,
        quantity: restockQty,
        reason: restockReason || undefined,
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(`Restocked +${restockQty} units.`)
      setRestockQty("")
      setRestockReason("")
      onSuccess()
    })
  }

  function handleAdjust(e: React.FormEvent) {
    e.preventDefault()
    if (!product) return

    startTransition(async () => {
      const result = await adjustStockAction({
        productId: product.id,
        newQuantity,
        reason: adjustReason,
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success("Stock adjusted.")
      setNewQuantity(String(result.data.product.stockQuantity))
      setAdjustReason("")
      onSuccess()
    })
  }

  if (!product) return null

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "restock", label: "Restock", icon: PackagePlusIcon },
    { id: "adjust", label: "Adjust", icon: SlidersHorizontalIcon },
    { id: "history", label: "History", icon: HistoryIcon },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Inventory · {product.name}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{product.sku}</span>
            <StockBadge product={product} />
            <span>· Sell {formatCurrency(product.sellingPrice)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          {tabs.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={tab === id ? "default" : "outline"}
              className="gap-1.5"
              onClick={() => setTab(id)}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </Button>
          ))}
        </div>

        {tab === "restock" && (
          <form onSubmit={handleRestock} className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Add units received from a supplier. Current stock:{" "}
              <strong className="text-foreground">{product.stockQuantity}</strong>
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="restockQty">Quantity to add *</Label>
                <Input
                  id="restockQty"
                  type="number"
                  min={1}
                  step={1}
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  disabled={pending}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="restockReason">Note (optional)</Label>
                <Input
                  id="restockReason"
                  placeholder="Supplier invoice, delivery ref…"
                  value={restockReason}
                  onChange={(e) => setRestockReason(e.target.value)}
                  disabled={pending}
                />
              </div>
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Restocking…" : "Confirm restock"}
            </Button>
          </form>
        )}

        {tab === "adjust" && (
          <form onSubmit={handleAdjust} className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Set the exact on-hand count after a physical count or correction.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newQuantity">New quantity *</Label>
                <Input
                  id="newQuantity"
                  type="number"
                  min={0}
                  step={1}
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  disabled={pending}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="adjustReason">Reason *</Label>
                <Input
                  id="adjustReason"
                  placeholder="Damaged units, count correction…"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  disabled={pending}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Apply adjustment"}
            </Button>
          </form>
        )}

        {tab === "history" && (
          <div className="space-y-4">
            {historyLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <p className="text-muted-foreground text-sm">No stock movements recorded yet.</p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatDateTime(row.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{movementTypeLabels[row.type]}</Badge>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "font-mono font-semibold tabular-nums",
                            row.quantityChange > 0
                              ? "text-emerald-600"
                              : row.quantityChange < 0
                                ? "text-destructive"
                                : ""
                          )}
                        >
                          {row.quantityChange > 0 ? "+" : ""}
                          {row.quantityChange}
                        </TableCell>
                        <TableCell className="font-mono text-xs tabular-nums">
                          {row.quantityBefore} → {row.quantityAfter}
                        </TableCell>
                        <TableCell className="max-w-[8rem] truncate text-xs">
                          {row.createdBy?.name ?? row.createdBy?.email ?? "—"}
                          {row.reason ? (
                            <span className="text-muted-foreground block truncate">{row.reason}</span>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {historyTotalPages > 1 && (
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={historyPage <= 1 || historyLoading}
                  onClick={() => setHistoryPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-muted-foreground text-xs">
                  Page {historyPage} of {historyTotalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={historyPage >= historyTotalPages || historyLoading}
                  onClick={() => setHistoryPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
