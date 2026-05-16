import { z } from "zod"
import { StockMovementType } from "@prisma/client"

const money = z.coerce
  .number({ error: "Enter a valid price" })
  .finite("Enter a valid price")
  .min(0, "Price cannot be negative")

const optionalUrl = z
  .string()
  .trim()
  .transform((v) => (v.length === 0 ? null : v))
  .nullable()
  .refine((v) => v === null || z.string().url().safeParse(v).success, {
    message: "Image must be a valid URL",
  })

const optionalBarcode = z
  .string()
  .trim()
  .transform((v) => (v.length === 0 ? null : v))
  .nullable()

export const productBaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Product name is required")
    .max(255, "Name is too long"),
  sku: z
    .string()
    .trim()
    .min(1, "SKU is required")
    .max(100, "SKU is too long")
    .transform((v) => v.toUpperCase()),
  category: z
    .string()
    .trim()
    .min(1, "Category is required")
    .max(120, "Category is too long"),
  barcode: optionalBarcode,
  costPrice: money,
  sellingPrice: money,
  stockQuantity: z.coerce
    .number()
    .int("Stock must be a whole number")
    .min(0, "Stock cannot be negative"),
  lowStockThreshold: z.coerce
    .number()
    .int("Threshold must be a whole number")
    .min(0, "Threshold cannot be negative"),
  description: z
    .string()
    .trim()
    .max(5000, "Description is too long")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  imageUrl: optionalUrl,
})

export const createProductSchema = productBaseSchema.refine(
  (data) => data.sellingPrice >= data.costPrice,
  {
    message: "Selling price should not be below cost price",
    path: ["sellingPrice"],
  }
)

export const updateProductSchema = productBaseSchema
  .extend({
    id: z.string().cuid("Invalid product"),
  })
  .refine((data) => data.sellingPrice >= data.costPrice, {
    message: "Selling price should not be below cost price",
    path: ["sellingPrice"],
  })

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(10),
  search: z.string().trim().optional().default(""),
  category: z.string().trim().optional().default(""),
  stockStatus: z.enum(["all", "low", "out"]).default("all"),
  sortBy: z
    .enum(["name", "sku", "category", "stockQuantity", "sellingPrice", "createdAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
})

export const restockSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .positive("Restock quantity must be greater than zero"),
  reason: z.string().trim().max(500).optional(),
})

export const adjustStockSchema = z.object({
  productId: z.string().cuid(),
  newQuantity: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .min(0, "Stock cannot be negative"),
  reason: z
    .string()
    .trim()
    .min(1, "Please provide a reason for the adjustment")
    .max(500, "Reason is too long"),
})

export const stockHistoryQuerySchema = z.object({
  productId: z.string().cuid(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type ProductListQuery = z.infer<typeof productListQuerySchema>

export const movementTypeLabels: Record<StockMovementType, string> = {
  RESTOCK: "Restock",
  ADJUSTMENT: "Adjustment",
  SALE: "Sale",
  CANCELLATION: "Cancellation",
  INITIAL: "Initial stock",
}
