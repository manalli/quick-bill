export const ORDER_STATUSES = ["COMPLETED", "CANCELLED"] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const PAYMENT_METHODS = ["CASH", "CARD", "UPI", "OTHER"] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const DISCOUNT_TYPES = ["PERCENT", "FIXED"] as const
export type DiscountType = (typeof DISCOUNT_TYPES)[number]
