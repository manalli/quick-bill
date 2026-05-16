"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { PaymentMethod } from "@/types/order"
import { checkoutAction } from "@/lib/actions/orders"
import { useCartTotals } from "@/hooks/use-cart-totals"
import { useCartStore } from "@/store/cart-store"
import { formatCurrency } from "@/lib/format"
import { paymentMethodLabels } from "@/lib/orders/labels"
import { toast } from "@/lib/toasts"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const selectClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-inner outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CheckoutDialog({ open, onOpenChange }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const items = useCartStore((s) => s.items)
  const paymentMethod = useCartStore((s) => s.paymentMethod)
  const setPaymentMethod = useCartStore((s) => s.setPaymentMethod)
  const customerName = useCartStore((s) => s.customerName)
  const customerPhone = useCartStore((s) => s.customerPhone)
  const notes = useCartStore((s) => s.notes)
  const setCustomer = useCartStore((s) => s.setCustomer)
  const setNotes = useCartStore((s) => s.setNotes)
  const clearCart = useCartStore((s) => s.clearCart)
  const discountType = useCartStore((s) => s.discountType)
  const discountValue = useCartStore((s) => s.discountValue)
  const taxRate = useCartStore((s) => s.taxRate)

  const totals = useCartTotals()

  function confirmCheckout() {
    if (items.length === 0) {
      toast.error("Cart is empty.")
      return
    }

    setError(null)

    startTransition(async () => {
      const result = await checkoutAction({
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        discountType,
        discountValue,
        taxRate,
        paymentMethod,
        notes: notes || undefined,
      })

      if (!result.success) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(`Order ${result.data.order.orderNumber} completed.`)
      clearCart()
      onOpenChange(false)
      router.push(`/dashboard/orders/${result.data.order.id}/invoice?print=1`)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete sale</DialogTitle>
          <DialogDescription>
            Stock will be deducted atomically. Order cannot be edited after completion.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Items</span>
              <span className="font-semibold">{items.length}</span>
            </div>
            <div className="mt-2 flex justify-between text-lg font-semibold">
              <span>Total due</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payMethod">Payment method</Label>
              <select
                id="payMethod"
                className={selectClass}
                value={paymentMethod}
                disabled={pending}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                {(Object.keys(paymentMethodLabels) as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {paymentMethodLabels[m]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="custName">Customer name</Label>
              <Input
                id="custName"
                value={customerName}
                disabled={pending}
                placeholder="Walk-in"
                onChange={(e) => setCustomer(e.target.value, customerPhone)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="custPhone">Phone (optional)</Label>
              <Input
                id="custPhone"
                value={customerPhone}
                disabled={pending}
                onChange={(e) => setCustomer(customerName, e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="orderNotes">Notes</Label>
              <Textarea
                id="orderNotes"
                rows={2}
                value={notes}
                disabled={pending}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="text-destructive text-sm font-medium" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button disabled={pending || items.length === 0} onClick={confirmCheckout}>
            {pending ? "Processing…" : "Confirm & print receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
