import type { Product, StockMovement, User } from "@prisma/client"
import { decimalToNumber } from "@/lib/actions/utils"

export type SerializedProduct = {
  id: string
  name: string
  sku: string
  category: string
  barcode: string | null
  costPrice: number
  sellingPrice: number
  stockQuantity: number
  lowStockThreshold: number
  description: string | null
  imageUrl: string | null
  createdAt: string
  updatedAt: string
  isLowStock: boolean
  isOutOfStock: boolean
}

export function serializeProduct(product: Product): SerializedProduct {
  const stockQuantity = product.stockQuantity
  const lowStockThreshold = product.lowStockThreshold

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category,
    barcode: product.barcode,
    costPrice: decimalToNumber(product.costPrice),
    sellingPrice: decimalToNumber(product.sellingPrice),
    stockQuantity,
    lowStockThreshold,
    description: product.description,
    imageUrl: product.imageUrl,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    isLowStock: stockQuantity > 0 && stockQuantity <= lowStockThreshold,
    isOutOfStock: stockQuantity === 0,
  }
}

export type SerializedMovement = {
  id: string
  type: StockMovement["type"]
  quantityChange: number
  quantityBefore: number
  quantityAfter: number
  reason: string | null
  createdAt: string
  createdBy: { id: string; name: string | null; email: string } | null
}

export function serializeMovement(
  movement: StockMovement & { createdBy: Pick<User, "id" | "name" | "email"> | null }
): SerializedMovement {
  return {
    id: movement.id,
    type: movement.type,
    quantityChange: movement.quantityChange,
    quantityBefore: movement.quantityBefore,
    quantityAfter: movement.quantityAfter,
    reason: movement.reason,
    createdAt: movement.createdAt.toISOString(),
    createdBy: movement.createdBy
      ? {
          id: movement.createdBy.id,
          name: movement.createdBy.name,
          email: movement.createdBy.email,
        }
      : null,
  }
}
