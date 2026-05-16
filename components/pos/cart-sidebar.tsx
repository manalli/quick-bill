"use client"

import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react"
import type { DiscountType } from "@/types/order"
import { useCartTotals } from "@/hooks/use-cart-totals"
import { useCartStore } from "@/store/cart-store"
import { formatCurrency } from "@/lib/format"
import { discountTypeLabels } from "@/lib/orders/labels"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35"

type Props = {
  onCheckout: () => void
  checkoutDisabled?: boolean
}

export function CartSidebar({ onCheckout, checkoutDisabled }: Props) {
  const items = useCartStore((s) => s.items)
  const setQuantity = useCartStore((s) => s.setQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const clearCart = useCartStore((s) => s.clearCart)
  const discountType = useCartStore((s) => s.discountType)
  const discountValue = useCartStore((s) => s.discountValue)
  const taxRate = useCartStore((s) => s.taxRate)
  const setDiscount = useCartStore((s) => s.setDiscount)
  const setTaxRate = useCartStore((s) => s.setTaxRate)

  const totals = useCartTotals()

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold tracking-tight">Cart</h2>
        {items.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-8"
            onClick={clearCart}
          >
            Clear
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <p className="text-muted-foreground px-2 py-8 text-center text-sm">
            Scan or search products, then press{" "}
            <kbd className="rounded border px-1">Enter</kbd> to add.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.product.id}
                className="rounded-lg border border-border/80 bg-muted/30 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.product.name}</p>
                    <p className="text-muted-foreground font-mono text-[10px]">
                      {item.product.sku}
                    </p>
                    <p className="mt-1 text-xs tabular-nums">
                      {formatCurrency(item.product.sellingPrice)} each
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground shrink-0"
                    onClick={() => removeItem(item.product.id)}
                    aria-label={`Remove ${item.product.name}`}
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-xs"
                      onClick={() => setQuantity(item.product.id, item.quantity - 1)}
                      aria-label="Decrease quantity"
                    >
                      <MinusIcon className="size-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-semibold tabular-nums">
                      {item.quantity}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-xs"
                      disabled={item.quantity >= item.product.stockQuantity}
                      onClick={() => setQuantity(item.product.id, item.quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      <PlusIcon className="size-3" />
                    </Button>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCurrency(item.product.sellingPrice * item.quantity)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-border space-y-3 border-t p-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Discount</Label>
            <select
              className={selectClass}
              value={discountType ?? ""}
              onChange={(e) => {
                const v = e.target.value
                setDiscount(v ? (v as DiscountType) : null, discountValue)
              }}
            >
              <option value="">None</option>
              <option value="PERCENT">{discountTypeLabels.PERCENT}</option>
              <option value="FIXED">{discountTypeLabels.FIXED}</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Value</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              className="h-9"
              disabled={!discountType}
              value={discountValue || ""}
              onChange={(e) => setDiscount(discountType, Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Tax rate (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            step="0.5"
            className="h-9"
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
          />
        </div>

        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular-nums font-medium">{formatCurrency(totals.subtotal)}</dd>
          </div>
          {totals.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
              <dt>Discount</dt>
              <dd className="tabular-nums">−{formatCurrency(totals.discountAmount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Tax ({taxRate}%)</dt>
            <dd className="tabular-nums font-medium">{formatCurrency(totals.taxAmount)}</dd>
          </div>
          <div className="border-border flex justify-between border-t pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatCurrency(totals.total)}</dd>
          </div>
        </dl>

        <Button
          type="button"
          className={cn("h-12 w-full text-base font-semibold")}
          disabled={items.length === 0 || checkoutDisabled}
          onClick={onCheckout}
        >
          Checkout <span className="text-primary-foreground/80 ml-2 text-xs">F9</span>
        </Button>
      </div>
    </aside>
  )
}
