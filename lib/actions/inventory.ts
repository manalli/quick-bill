"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db/prisma"
import { getRequiredSession } from "@/lib/auth/session"
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/actions/utils"
import { serializeMovement, serializeProduct } from "@/lib/products/serialize"
import { adjustStockSchema, restockSchema } from "@/lib/validations/product"

const PRODUCTS_PATH = "/dashboard/products"

export async function restockProductAction(
  input: unknown
): Promise<ActionResult<{ product: ReturnType<typeof serializeProduct>; movement: ReturnType<typeof serializeMovement> }>> {
  try {
    const session = await getRequiredSession()
    const parsed = restockSchema.safeParse(input)
    if (!parsed.success) {
      return actionError(parsed.error.issues[0]?.message ?? "Invalid restock data.")
    }

    const { productId, quantity, reason } = parsed.data

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } })
      if (!product) throw new Error("NOT_FOUND")

      const quantityBefore = product.stockQuantity
      const quantityAfter = quantityBefore + quantity

      const updated = await tx.product.update({
        where: { id: productId },
        data: { stockQuantity: quantityAfter },
      })

      const movement = await tx.stockMovement.create({
        data: {
          productId,
          type: "RESTOCK",
          quantityChange: quantity,
          quantityBefore,
          quantityAfter,
          reason: reason?.trim() || "Restock",
          createdById: session.user.id,
        },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
      })

      return { product: updated, movement }
    })

    revalidatePath(PRODUCTS_PATH)
    return actionSuccess({
      product: serializeProduct(result.product),
      movement: serializeMovement(result.movement),
    })
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return actionError("Product not found.")
    }
    return actionError("Failed to restock product.")
  }
}

export async function adjustStockAction(
  input: unknown
): Promise<ActionResult<{ product: ReturnType<typeof serializeProduct>; movement: ReturnType<typeof serializeMovement> }>> {
  try {
    const session = await getRequiredSession()
    const parsed = adjustStockSchema.safeParse(input)
    if (!parsed.success) {
      return actionError(parsed.error.issues[0]?.message ?? "Invalid adjustment data.")
    }

    const { productId, newQuantity, reason } = parsed.data

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } })
      if (!product) throw new Error("NOT_FOUND")

      const quantityBefore = product.stockQuantity
      if (quantityBefore === newQuantity) {
        throw new Error("NO_CHANGE")
      }

      const quantityChange = newQuantity - quantityBefore

      const updated = await tx.product.update({
        where: { id: productId },
        data: { stockQuantity: newQuantity },
      })

      const movement = await tx.stockMovement.create({
        data: {
          productId,
          type: "ADJUSTMENT",
          quantityChange,
          quantityBefore,
          quantityAfter: newQuantity,
          reason,
          createdById: session.user.id,
        },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
      })

      return { product: updated, movement }
    })

    revalidatePath(PRODUCTS_PATH)
    return actionSuccess({
      product: serializeProduct(result.product),
      movement: serializeMovement(result.movement),
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") return actionError("Product not found.")
      if (error.message === "NO_CHANGE") {
        return actionError("New quantity matches current stock — no adjustment needed.")
      }
    }
    return actionError("Failed to adjust stock.")
  }
}
