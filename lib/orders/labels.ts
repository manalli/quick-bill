import type { DiscountType, PaymentMethod } from "@/types/order"

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  OTHER: "Other",
}

export const discountTypeLabels: Record<DiscountType, string> = {
  PERCENT: "Percentage",
  FIXED: "Fixed amount",
}
