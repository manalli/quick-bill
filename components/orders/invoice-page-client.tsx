"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { cancelOrderAction } from "@/lib/actions/orders"
import type { SerializedOrder } from "@/lib/orders/serialize"
import { InvoiceDocument } from "@/components/orders/invoice-document"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/lib/toasts"

type Props = {
  order: SerializedOrder
  autoPrint?: boolean
}

export function InvoicePageClient({ order: initialOrder, autoPrint }: Props) {
  const router = useRouter()
  const [order, setOrder] = useState(initialOrder)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [pending, startTransition] = useTransition()

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelOrderAction({ orderId: order.id, reason })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Order cancelled. Stock restored.")
      setOrder(result.data.order)
      setCancelOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <InvoiceDocument
        order={order}
        autoPrint={autoPrint}
        onCancel={() => setCancelOpen(true)}
        cancelPending={pending}
      />

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel order {order.orderNumber}?</DialogTitle>
            <DialogDescription>
              This reverses all stock deductions from this sale. The invoice remains for records
              but is marked cancelled.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancelReason">Reason *</Label>
            <Input
              id="cancelReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={pending}
              placeholder="Wrong items, customer return…"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setCancelOpen(false)}>
              Keep order
            </Button>
            <Button
              variant="destructive"
              disabled={pending || reason.trim().length < 3}
              onClick={handleCancel}
            >
              {pending ? "Cancelling…" : "Cancel & restore stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
