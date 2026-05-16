import type { Prisma } from "@prisma/client"
import { subDays, startOfDay, endOfDay } from "date-fns"
import { prisma } from "@/lib/db/prisma"
import { decimalToNumber } from "@/lib/actions/utils"

export async function getDailySummaryContext() {
  const now = new Date()
  const todayFrom = startOfDay(now)
  const todayTo = endOfDay(now)
  const yesterdayFrom = startOfDay(subDays(now, 1))
  const yesterdayTo = endOfDay(subDays(now, 1))
  const weekFrom = startOfDay(subDays(now, 6))

  const completed = { status: "COMPLETED" as const }

  const [
    todayOrders,
    yesterdayOrders,
    todayItems,
    yesterdayItems,
    lowStockCount,
    weekTopProducts,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { ...completed, createdAt: { gte: todayFrom, lte: todayTo } },
      _count: { id: true },
      _sum: { total: true, subtotal: true },
    }),
    prisma.order.aggregate({
      where: { ...completed, createdAt: { gte: yesterdayFrom, lte: yesterdayTo } },
      _count: { id: true },
      _sum: { total: true },
    }),
    prisma.orderItem.findMany({
      where: { order: { ...completed, createdAt: { gte: todayFrom, lte: todayTo } } },
      select: {
        quantity: true,
        lineTotal: true,
        productName: true,
        product: { select: { category: true } },
      },
    }),
    prisma.orderItem.findMany({
      where: {
        order: { ...completed, createdAt: { gte: yesterdayFrom, lte: yesterdayTo } },
      },
      select: {
        quantity: true,
        lineTotal: true,
        product: { select: { category: true } },
      },
    }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count FROM products
      WHERE stock_quantity > 0 AND stock_quantity <= low_stock_threshold
    `,
    prisma.orderItem.groupBy({
      by: ["productId", "productName", "productSku"],
      where: {
        order: { ...completed, createdAt: { gte: weekFrom, lte: todayTo } },
      },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ])

  const categoryToday = aggregateCategories(todayItems)
  const categoryYesterday = aggregateCategories(yesterdayItems)

  const todayRevenue = decimalToNumber(todayOrders._sum.total ?? 0)
  const yesterdayRevenue = decimalToNumber(yesterdayOrders._sum.total ?? 0)
  const revenueChangePct =
    yesterdayRevenue > 0
      ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 1000) / 10
      : todayRevenue > 0
        ? 100
        : 0

  return {
    date: now.toISOString().slice(0, 10),
    today: {
      orders: todayOrders._count.id,
      revenue: todayRevenue,
      subtotal: decimalToNumber(todayOrders._sum.subtotal ?? 0),
    },
    yesterday: {
      orders: yesterdayOrders._count.id,
      revenue: yesterdayRevenue,
    },
    revenueChangePct,
    lowStockCount: Number(lowStockCount[0]?.count ?? 0),
    categoryToday,
    categoryYesterday,
    topProductsToday: topProductsFromItems(todayItems).slice(0, 5),
    topProductsWeek: weekTopProducts.map((p) => ({
      name: p.productName,
      sku: p.productSku,
      units: p._sum.quantity ?? 0,
      revenue: decimalToNumber(p._sum.lineTotal ?? 0),
    })),
  }
}

function aggregateCategories(
  items: {
    quantity: number
    lineTotal: Prisma.Decimal
    product: { category: string }
  }[]
) {
  const map = new Map<string, { units: number; revenue: number }>()
  for (const item of items) {
    const cat = item.product.category
    const prev = map.get(cat) ?? { units: 0, revenue: 0 }
    map.set(cat, {
      units: prev.units + item.quantity,
      revenue: prev.revenue + decimalToNumber(item.lineTotal),
    })
  }
  return [...map.entries()]
    .map(([category, stats]) => ({ category, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
}

function topProductsFromItems(
  items: { quantity: number; lineTotal: Prisma.Decimal; productName: string }[]
) {
  const map = new Map<string, { units: number; revenue: number }>()
  for (const item of items) {
    const prev = map.get(item.productName) ?? { units: 0, revenue: 0 }
    map.set(item.productName, {
      units: prev.units + item.quantity,
      revenue: prev.revenue + decimalToNumber(item.lineTotal),
    })
  }
  return [...map.entries()]
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
}

export async function getRestockContext() {
  const now = new Date()
  const last7 = startOfDay(subDays(now, 6))
  const last30 = startOfDay(subDays(now, 29))
  const todayTo = endOfDay(now)

  const completed = { status: "COMPLETED" as const }

  const [products, sales7d, sales30d] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        stockQuantity: true,
        lowStockThreshold: true,
        sellingPrice: true,
        costPrice: true,
      },
      orderBy: { stockQuantity: "asc" },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: { ...completed, createdAt: { gte: last7, lte: todayTo } },
      },
      _sum: { quantity: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: { ...completed, createdAt: { gte: last30, lte: todayTo } },
      },
      _sum: { quantity: true },
    }),
  ])

  const map7 = new Map(sales7d.map((r) => [r.productId, r._sum.quantity ?? 0]))
  const map30 = new Map(sales30d.map((r) => [r.productId, r._sum.quantity ?? 0]))

  const enriched = products.map((p) => {
    const sold7 = map7.get(p.id) ?? 0
    const sold30 = map30.get(p.id) ?? 0
    const dailyVelocity7 = sold7 / 7
    const daysOfCover =
      dailyVelocity7 > 0 ? Math.round((p.stockQuantity / dailyVelocity7) * 10) / 10 : null

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      stockQuantity: p.stockQuantity,
      lowStockThreshold: p.lowStockThreshold,
      soldLast7Days: sold7,
      soldLast30Days: sold30,
      dailyVelocity7: Math.round(dailyVelocity7 * 100) / 100,
      daysOfCover,
      isLowStock: p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold,
      isOutOfStock: p.stockQuantity === 0,
    }
  })

  const priority = enriched
    .filter((p) => p.isLowStock || p.isOutOfStock || (p.dailyVelocity7 >= 1 && p.daysOfCover !== null && p.daysOfCover < 7))
    .sort((a, b) => {
      if (a.isOutOfStock !== b.isOutOfStock) return a.isOutOfStock ? -1 : 1
      if (a.isLowStock !== b.isLowStock) return a.isLowStock ? -1 : 1
      return (a.daysOfCover ?? 999) - (b.daysOfCover ?? 999)
    })
    .slice(0, 25)

  return {
    generatedAt: now.toISOString(),
    productCount: products.length,
    lowStockCount: enriched.filter((p) => p.isLowStock).length,
    outOfStockCount: enriched.filter((p) => p.isOutOfStock).length,
    priorityProducts: priority,
    topVelocity: [...enriched]
      .sort((a, b) => b.soldLast7Days - a.soldLast7Days)
      .slice(0, 10)
      .filter((p) => p.soldLast7Days > 0),
  }
}

export type DailySummaryContext = Awaited<ReturnType<typeof getDailySummaryContext>>
export type RestockContext = Awaited<ReturnType<typeof getRestockContext>>
