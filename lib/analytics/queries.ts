import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db/prisma"
import { decimalToNumber } from "@/lib/actions/utils"
import { toDateRange, todayRange } from "@/lib/analytics/date-range"
import type { AnalyticsFilters } from "@/lib/validations/analytics"

function orderWhere(
  range: { from: Date; to: Date },
  filters: AnalyticsFilters
): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {
    status: "COMPLETED",
    createdAt: { gte: range.from, lte: range.to },
  }

  if (filters.cashierId) {
    where.createdById = filters.cashierId
  }

  if (filters.category) {
    where.items = {
      some: {
        product: { category: filters.category },
      },
    }
  }

  return where
}

export async function getFilterOptions() {
  const [categories, cashiers] = await Promise.all([
    prisma.product.findMany({
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
    prisma.user.findMany({
      where: { ordersCreated: { some: { status: "COMPLETED" } } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ])

  return {
    categories: categories.map((c) => c.category),
    cashiers: cashiers.map((u) => ({
      id: u.id,
      label: u.name?.trim() || u.email,
    })),
  }
}

export async function getDashboardAnalytics(filters: AnalyticsFilters) {
  const range = toDateRange(filters)
  const today = todayRange()
  const where = orderWhere(range, filters)
  const whereToday = orderWhere(today, filters)

  const [
    todayAgg,
    periodAgg,
    recentOrders,
    topProductsRaw,
    lowStock,
    categoryRows,
    monthlyOrders,
    products,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: whereToday,
      _count: { id: true },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where,
      _count: { id: true },
      _sum: { total: true, subtotal: true, discountAmount: true },
    }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        orderNumber: true,
        total: true,
        status: true,
        createdAt: true,
        customerName: true,
        createdBy: { select: { name: true, email: true } },
      },
    }),
    prisma.orderItem.groupBy({
      by: ["productId", "productName", "productSku"],
      where: {
        order: where,
      },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 8,
    }),
    prisma.$queryRaw<
      {
        id: string
        name: string
        sku: string
        category: string
        stock_quantity: number
        low_stock_threshold: number
      }[]
    >`
      SELECT id, name, sku, category, stock_quantity, low_stock_threshold
      FROM products
      WHERE stock_quantity > 0 AND stock_quantity <= low_stock_threshold
      ORDER BY stock_quantity ASC
      LIMIT 12
    `,
    prisma.orderItem.findMany({
      where: { order: where },
      select: {
        lineTotal: true,
        quantity: true,
        product: { select: { category: true, costPrice: true } },
      },
    }),
    prisma.order.findMany({
      where,
      select: { createdAt: true, total: true },
    }),
    prisma.product.findMany({
      select: { stockQuantity: true, costPrice: true, sellingPrice: true },
    }),
  ])

  let estimatedProfit = 0
  const categoryMap = new Map<string, { revenue: number; units: number }>()

  for (const row of categoryRows) {
    const revenue = decimalToNumber(row.lineTotal)
    const cost = decimalToNumber(row.product.costPrice) * row.quantity
    estimatedProfit += revenue - cost

    const cat = row.product.category
    const prev = categoryMap.get(cat) ?? { revenue: 0, units: 0 }
    categoryMap.set(cat, {
      revenue: prev.revenue + revenue,
      units: prev.units + row.quantity,
    })
  }

  const categoryPerformance = [...categoryMap.entries()]
    .map(([category, stats]) => ({ category, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)

  const monthMap = new Map<string, { revenue: number; orders: number }>()
  for (const order of monthlyOrders) {
    const key = order.createdAt.toISOString().slice(0, 7)
    const prev = monthMap.get(key) ?? { revenue: 0, orders: 0 }
    monthMap.set(key, {
      revenue: prev.revenue + decimalToNumber(order.total),
      orders: prev.orders + 1,
    })
  }

  const monthlyTrends = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, stats]) => ({ month, ...stats }))

  let inventoryCostValue = 0
  let inventoryRetailValue = 0
  for (const p of products) {
    inventoryCostValue += p.stockQuantity * decimalToNumber(p.costPrice)
    inventoryRetailValue += p.stockQuantity * decimalToNumber(p.sellingPrice)
  }

  const periodRevenue = decimalToNumber(periodAgg._sum.total ?? 0)

  return {
    today: {
      orders: todayAgg._count.id,
      revenue: decimalToNumber(todayAgg._sum.total ?? 0),
    },
    period: {
      orders: periodAgg._count.id,
      revenue: periodRevenue,
      subtotal: decimalToNumber(periodAgg._sum.subtotal ?? 0),
      discounts: decimalToNumber(periodAgg._sum.discountAmount ?? 0),
      profit: Math.round(estimatedProfit * 100) / 100,
    },
    topProducts: topProductsRaw.map((row) => ({
      productId: row.productId,
      name: row.productName,
      sku: row.productSku,
      quantity: row._sum.quantity ?? 0,
      revenue: decimalToNumber(row._sum.lineTotal ?? 0),
    })),
    lowStock: lowStock.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      stockQuantity: p.stock_quantity,
      lowStockThreshold: p.low_stock_threshold,
    })),
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      total: decimalToNumber(o.total),
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      customerName: o.customerName,
      cashier: o.createdBy.name ?? o.createdBy.email,
    })),
    categoryPerformance,
    monthlyTrends,
    inventory: {
      costValue: Math.round(inventoryCostValue * 100) / 100,
      retailValue: Math.round(inventoryRetailValue * 100) / 100,
      skuCount: products.length,
    },
  }
}

export type DashboardAnalytics = Awaited<ReturnType<typeof getDashboardAnalytics>>

export async function getSalesReport(filters: AnalyticsFilters) {
  const range = toDateRange(filters)
  const where = orderWhere(range, filters)

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true, email: true } },
      items: {
        include: { product: { select: { category: true } } },
      },
    },
  })

  return orders.map((o) => ({
    orderNumber: o.orderNumber,
    date: o.createdAt,
    customer: o.customerName ?? "Walk-in",
    cashier: o.createdBy.name ?? o.createdBy.email,
    payment: o.paymentMethod,
    subtotal: decimalToNumber(o.subtotal),
    discount: decimalToNumber(o.discountAmount),
    tax: decimalToNumber(o.taxAmount),
    total: decimalToNumber(o.total),
    items: o.items.map((i) => ({
      sku: i.productSku,
      name: i.productName,
      category: i.product.category,
      qty: i.quantity,
      unitPrice: decimalToNumber(i.unitPrice),
      lineTotal: decimalToNumber(i.lineTotal),
    })),
  }))
}

export async function getInventoryReport(filters: AnalyticsFilters) {
  const where: Prisma.ProductWhereInput = filters.category
    ? { category: filters.category }
    : {}

  const products = await prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
  })

  return products.map((p) => ({
    sku: p.sku,
    name: p.name,
    category: p.category,
    stock: p.stockQuantity,
    lowThreshold: p.lowStockThreshold,
    costPrice: decimalToNumber(p.costPrice),
    sellPrice: decimalToNumber(p.sellingPrice),
    costValue: p.stockQuantity * decimalToNumber(p.costPrice),
    retailValue: p.stockQuantity * decimalToNumber(p.sellingPrice),
    status:
      p.stockQuantity === 0
        ? "Out of stock"
        : p.stockQuantity <= p.lowStockThreshold
          ? "Low stock"
          : "OK",
  }))
}

export async function getProfitReport(filters: AnalyticsFilters) {
  const range = toDateRange(filters)
  const where = orderWhere(range, filters)

  const items = await prisma.orderItem.findMany({
    where: { order: where },
    include: {
      product: { select: { category: true, costPrice: true, sku: true, name: true } },
      order: {
        select: {
          orderNumber: true,
          createdAt: true,
          createdBy: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { order: { createdAt: "desc" } },
  })

  return items.map((i) => {
    const revenue = decimalToNumber(i.lineTotal)
    const cost = decimalToNumber(i.product.costPrice) * i.quantity
    return {
      orderNumber: i.order.orderNumber,
      date: i.order.createdAt,
      cashier: i.order.createdBy.name ?? i.order.createdBy.email,
      sku: i.productSku,
      name: i.productName,
      category: i.product.category,
      quantity: i.quantity,
      revenue,
      cost,
      profit: Math.round((revenue - cost) * 100) / 100,
    }
  })
}
