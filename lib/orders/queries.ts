import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db/prisma"
import type { orderListQuerySchema } from "@/lib/validations/order"
import type { z } from "zod"
import { serializeOrder } from "@/lib/orders/serialize"

const orderInclude = {
  items: { orderBy: { productName: "asc" as const } },
  createdBy: { select: { id: true, name: true, email: true } },
  cancelledBy: { select: { id: true, name: true, email: true } },
}

export async function getOrderById(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  })
  return order ? serializeOrder(order) : null
}

export async function getOrderByNumber(orderNumber: string) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: orderInclude,
  })
  return order ? serializeOrder(order) : null
}

export async function listOrders(query: z.infer<typeof orderListQuerySchema>) {
  const { page, pageSize, status, search } = query
  const skip = (page - 1) * pageSize

  const where: Prisma.OrderWhereInput = {}

  if (status !== "all") {
    where.status = status
  }

  if (search) {
    where.OR = [
      { orderNumber: { contains: search } },
      { customerName: { contains: search } },
      { customerPhone: { contains: search } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ])

  return {
    items: items.map(serializeOrder),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export async function searchPosProducts(q: string, limit: number) {
  const where: Prisma.ProductWhereInput =
    q.length > 0
      ? {
          OR: [
            { name: { contains: q } },
            { sku: { contains: q } },
            { barcode: { contains: q } },
            { category: { contains: q } },
          ],
        }
      : {}

  const products = await prisma.product.findMany({
    where,
    orderBy: [{ name: "asc" }],
    take: limit,
    select: {
      id: true,
      name: true,
      sku: true,
      category: true,
      barcode: true,
      sellingPrice: true,
      stockQuantity: true,
      lowStockThreshold: true,
      imageUrl: true,
    },
  })

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: p.category,
    barcode: p.barcode,
    sellingPrice: Number(p.sellingPrice),
    stockQuantity: p.stockQuantity,
    lowStockThreshold: p.lowStockThreshold,
    imageUrl: p.imageUrl,
    isLowStock: p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold,
    isOutOfStock: p.stockQuantity === 0,
  }))
}
