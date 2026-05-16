import type { DiscountType } from "@/types/order"

export type CartLineInput = {
  productId: string
  quantity: number
  unitPrice: number
}

export type OrderTotalsInput = {
  lines: CartLineInput[]
  discountType: DiscountType | null
  discountValue: number
  taxRate: number
}

export type OrderTotals = {
  subtotal: number
  discountAmount: number
  subtotalAfterDiscount: number
  taxAmount: number
  total: number
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100
}

export function computeLineTotal(unitPrice: number, quantity: number) {
  return roundMoney(unitPrice * quantity)
}

export function computeOrderTotals(input: OrderTotalsInput): OrderTotals {
  const subtotal = roundMoney(
    input.lines.reduce(
      (sum, line) => sum + computeLineTotal(line.unitPrice, line.quantity),
      0
    )
  )

  let discountAmount = 0

  if (input.discountType && input.discountValue > 0) {
    if (input.discountType === "PERCENT") {
      const pct = Math.min(100, Math.max(0, input.discountValue))
      discountAmount = roundMoney(subtotal * (pct / 100))
    } else {
      discountAmount = roundMoney(Math.min(input.discountValue, subtotal))
    }
  }

  const subtotalAfterDiscount = roundMoney(subtotal - discountAmount)

  const taxRate = Math.max(0, input.taxRate)
  const taxAmount = roundMoney(subtotalAfterDiscount * (taxRate / 100))

  const total = roundMoney(subtotalAfterDiscount + taxAmount)

  return {
    subtotal,
    discountAmount,
    subtotalAfterDiscount,
    taxAmount,
    total,
  }
}

export function getDefaultTaxRate() {
  const raw = process.env.DEFAULT_TAX_RATE
  const parsed = raw ? Number(raw) : 18
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 18
}