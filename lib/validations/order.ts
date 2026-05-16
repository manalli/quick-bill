import { z } from "zod"
import { DISCOUNT_TYPES, PAYMENT_METHODS } from "@/types/order"

const cartLineSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1"),
})

export const checkoutSchema = z
  .object({
    items: z.array(cartLineSchema).min(1, "Cart cannot be empty"),
    customerName: z.string().trim().max(255).optional(),
    customerPhone: z.string().trim().max(30).optional(),
    discountType: z.enum(DISCOUNT_TYPES).nullable(),
    discountValue: z.coerce.number().min(0, "Discount cannot be negative").default(0),
    taxRate: z.coerce.number().min(0).max(100).default(18),
    paymentMethod: z.enum(PAYMENT_METHODS),
    notes: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.discountType === "PERCENT" && data.discountValue > 100) {
      ctx.addIssue({
        code: "custom",
        message: "Percent discount cannot exceed 100%",
        path: ["discountValue"],
      })
    }
    if (data.discountType === "FIXED" && data.discountValue < 0) {
      ctx.addIssue({
        code: "custom",
        message: "Fixed discount cannot be negative",
        path: ["discountValue"],
      })
    }
  })

export const cancelOrderSchema = z.object({
  orderId: z.string().cuid(),
  reason: z
    .string()
    .trim()
    .min(3, "Please provide a cancellation reason")
    .max(500),
})

export const posSearchSchema = z.object({
  q: z.string().trim().max(120).default(""),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const orderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(15),
  status: z.enum(["all", "COMPLETED", "CANCELLED"]).default("all"),
  search: z.string().trim().optional().default(""),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>
