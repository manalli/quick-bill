"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db/prisma"
import { getRequiredSession } from "@/lib/auth/session"
import {
  actionError,
  actionSuccess,
  decimalToNumber,
  type ActionResult,
} from "@/lib/actions/utils"
import {
  computeLineTotal,
  computeOrderTotals,
} from "@/lib/orders/calculations"
import { generateOrderNumber } from "@/lib/orders/number"
import { getOrderById, listOrders, searchPosProducts } from "@/lib/orders/queries"
import { serializeOrder } from "@/lib/orders/serialize"
import {
  cancelOrderSchema,
  checkoutSchema,
  orderListQuerySchema,
  posSearchSchema,
} from "@/lib/validations/order"

const POS_PATH = "/dashboard/pos"
const ORDERS_PATH = "/dashboard/orders"

/** Atomically deduct stock; throws if insufficient (rolls back transaction). */
async function deductStock(
  tx: Prisma.TransactionClient,
  productId: string,
  quantity: number,
  orderId: string,
  userId: string
) {
  const before = await tx.product.findUnique({
    where: { id: productId },
    select: { stockQuantity: true },
  })

  if (!before) {
    throw new Error(`PRODUCT_NOT_FOUND:${productId}`)
  }

  if (before.stockQuantity < quantity) {
    throw new Error(`INSUFFICIENT_STOCK:${productId}`)
  }

  const updated = await tx.product.updateMany({
    where: { id: productId, stockQuantity: { gte: quantity } },
    data: { stockQuantity: { decrement: quantity } },
  })

  if (updated.count !== 1) {
    throw new Error(`INSUFFICIENT_STOCK:${productId}`)
  }

  const afterQty = before.stockQuantity - quantity

  await tx.stockMovement.create({
    data: {
      productId,
      orderId,
      type: "SALE",
      quantityChange: -quantity,
      quantityBefore: before.stockQuantity,
      quantityAfter: afterQty,
      reason: `Sale order`,
      createdById: userId,
    },
  })

  return afterQty
}

/** Atomically restore stock on cancellation. */
async function restoreStock(
  tx: Prisma.TransactionClient,
  productId: string,
  quantity: number,
  orderId: string,
  userId: string,
  orderNumber: string
) {
  const before = await tx.product.findUnique({
    where: { id: productId },
    select: { stockQuantity: true },
  })

  if (!before) {
    throw new Error(`PRODUCT_NOT_FOUND:${productId}`)
  }

  const updated = await tx.product.update({
    where: { id: productId },
    data: { stockQuantity: { increment: quantity } },
    select: { stockQuantity: true },
  })

  await tx.stockMovement.create({
    data: {
      productId,
      orderId,
      type: "CANCELLATION",
      quantityChange: quantity,
      quantityBefore: before.stockQuantity,
      quantityAfter: updated.stockQuantity,
      reason: `Cancelled order ${orderNumber}`,
      createdById: userId,
    },
  })
}

export async function searchPosProductsAction(
  raw: unknown
): Promise<ActionResult<Awaited<ReturnType<typeof searchPosProducts>>>> {
  try {
    await getRequiredSession()
    const parsed = posSearchSchema.safeParse(raw)
    if (!parsed.success) {
      return actionError("Invalid search.")
    }
    const data = await searchPosProducts(parsed.data.q, parsed.data.limit)
    return actionSuccess(data)
  } catch {
    return actionError("Failed to search products.")
  }
}

export async function checkoutAction(
  input: unknown
): Promise<ActionResult<{ order: ReturnType<typeof serializeOrder> }>> {
  try {
    const session = await getRequiredSession()
    const parsed = checkoutSchema.safeParse(input)
    if (!parsed.success) {
      return actionError(parsed.error.issues[0]?.message ?? "Invalid checkout data.")
    }

    const data = parsed.data

    const productIds = [...new Set(data.items.map((i) => i.productId))]
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    })

    if (products.length !== productIds.length) {
      return actionError("One or more products no longer exist.")
    }

    const productMap = new Map(products.map((p) => [p.id, p]))

    const merged = new Map<string, number>()
    for (const line of data.items) {
      merged.set(line.productId, (merged.get(line.productId) ?? 0) + line.quantity)
    }

    for (const [productId, qty] of merged) {
      const product = productMap.get(productId)!
      if (product.stockQuantity < qty) {
        return actionError(
          `Insufficient stock for "${product.name}" (available: ${product.stockQuantity}, requested: ${qty}).`
        )
      }
    }

    const cartLines = [...merged.entries()].map(([productId, quantity]) => {
      const product = productMap.get(productId)!
      const unitPrice = decimalToNumber(product.sellingPrice)
      return {
        productId,
        quantity,
        unitPrice,
        product,
        lineTotal: computeLineTotal(unitPrice, quantity),
      }
    })

    const totals = computeOrderTotals({
      lines: cartLines.map(({ productId, quantity, unitPrice }) => ({
        productId,
        quantity,
        unitPrice,
      })),
      discountType: data.discountType,
      discountValue: data.discountValue,
      taxRate: data.taxRate,
    })

    const order = await prisma.$transaction(async (tx) => {
      const orderNumber = await generateOrderNumber(tx)

      const created = await tx.order.create({
        data: {
          orderNumber,
          status: "COMPLETED",
          customerName: data.customerName?.trim() || null,
          customerPhone: data.customerPhone?.trim() || null,
          subtotal: new Prisma.Decimal(totals.subtotal),
          discountType: data.discountType,
          discountValue: new Prisma.Decimal(data.discountValue),
          discountAmount: new Prisma.Decimal(totals.discountAmount),
          taxRate: new Prisma.Decimal(data.taxRate),
          taxAmount: new Prisma.Decimal(totals.taxAmount),
          total: new Prisma.Decimal(totals.total),
          paymentMethod: data.paymentMethod,
          notes: data.notes?.trim() || null,
          createdById: session.user.id,
          items: {
            create: cartLines.map((line) => ({
              productId: line.productId,
              productName: line.product.name,
              productSku: line.product.sku,
              unitPrice: new Prisma.Decimal(line.unitPrice),
              quantity: line.quantity,
              lineTotal: new Prisma.Decimal(line.lineTotal),
            })),
          },
        },
        include: {
          items: true,
          createdBy: { select: { id: true, name: true, email: true } },
          cancelledBy: { select: { id: true, name: true, email: true } },
        },
      })

      for (const line of cartLines) {
        await deductStock(
          tx,
          line.productId,
          line.quantity,
          created.id,
          session.user.id
        )
      }

      return created
    })

    revalidatePath(POS_PATH)
    revalidatePath(ORDERS_PATH)
    revalidatePath("/dashboard/products")

    return actionSuccess({ order: serializeOrder(order) })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith("INSUFFICIENT_STOCK:")) {
        return actionError("Stock changed during checkout. Please review your cart.")
      }
    }
    console.error("[checkout]", error)
    return actionError("Checkout failed. No order was created.")
  }
}

export async function cancelOrderAction(
  input: unknown
): Promise<ActionResult<{ order: ReturnType<typeof serializeOrder> }>> {
  try {
    const session = await getRequiredSession()
    const parsed = cancelOrderSchema.safeParse(input)
    if (!parsed.success) {
      return actionError(parsed.error.issues[0]?.message ?? "Invalid cancellation.")
    }

    const { orderId, reason } = parsed.data

    const order = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      })

      if (!existing) throw new Error("NOT_FOUND")
      if (existing.status === "CANCELLED") throw new Error("ALREADY_CANCELLED")
      if (existing.status !== "COMPLETED") throw new Error("NOT_CANCELLABLE")

      const updated = await tx.order.update({
        where: { id: orderId, status: "COMPLETED" },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledById: session.user.id,
          cancelReason: reason,
        },
        include: {
          items: true,
          createdBy: { select: { id: true, name: true, email: true } },
          cancelledBy: { select: { id: true, name: true, email: true } },
        },
      })

      for (const item of existing.items) {
        await restoreStock(
          tx,
          item.productId,
          item.quantity,
          existing.id,
          session.user.id,
          existing.orderNumber
        )
      }

      return updated
    })

    revalidatePath(POS_PATH)
    revalidatePath(ORDERS_PATH)
    revalidatePath("/dashboard/products")
    revalidatePath(`/dashboard/orders/${order.id}/invoice`)

    return actionSuccess({ order: serializeOrder(order) })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") return actionError("Order not found.")
      if (error.message === "ALREADY_CANCELLED") return actionError("Order is already cancelled.")
    }
    return actionError("Failed to cancel order.")
  }
}

export async function getOrdersAction(raw: unknown) {
  try {
    await getRequiredSession()
    const query = orderListQuerySchema.parse(raw)
    const data = await listOrders(query)
    return actionSuccess(data)
  } catch {
    return actionError("Failed to load orders.")
  }
}

export async function getOrderAction(id: string) {
  try {
    await getRequiredSession()
    const order = await getOrderById(id)
    if (!order) return actionError("Order not found.")
    return actionSuccess(order)
  } catch {
    return actionError("Failed to load order.")
  }
}
