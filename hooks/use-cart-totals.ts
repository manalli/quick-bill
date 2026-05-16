"use client"

import { useMemo } from "react"
import { computeOrderTotals } from "@/lib/orders/calculations"
import { useCartStore } from "@/store/cart-store"

/**
 * Derived cart totals — never call store methods from selectors.
 * Subscribes only to primitive/stable slice fields.
 */
export function useCartTotals() {
  const items = useCartStore((s) => s.items)
  const discountType = useCartStore((s) => s.discountType)
  const discountValue = useCartStore((s) => s.discountValue)
  const taxRate = useCartStore((s) => s.taxRate)

  return useMemo(() => {
    const lines = items.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      unitPrice: item.product.sellingPrice,
    }))

    return computeOrderTotals({
      lines,
      discountType,
      discountValue,
      taxRate,
    })
  }, [items, discountType, discountValue, taxRate])
}
