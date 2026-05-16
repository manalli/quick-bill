import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db/prisma"
import type { ProductListQuery } from "@/lib/validations/product"
import { serializeProduct } from "@/lib/products/serialize"

function buildSearchFilter(search: string): Prisma.ProductWhereInput | undefined {
  if (!search) return undefined
  return {
    OR: [
      { name: { contains: search } },
      { sku: { contains: search } },
      { barcode: { contains: search } },
      { category: { contains: search } },
    ],
  }
}

function buildWhere(query: ProductListQuery): Prisma.ProductWhereInput {
  const filters: Prisma.ProductWhereInput[] = []

  if (query.category) {
    filters.push({ category: query.category })
  }

  const searchFilter = buildSearchFilter(query.search)
  if (searchFilter) filters.push(searchFilter)

  if (query.stockStatus === "out") {
    filters.push({ stockQuantity: 0 })
  }

  if (filters.length === 0) return {}
  if (filters.length === 1) return filters[0]!
  return { AND: filters }
}

export async function countLowStockProducts() {
  const rows = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) AS count
    FROM products
    WHERE stock_quantity > 0
      AND stock_quantity <= low_stock_threshold
  `
  return Number(rows[0]?.count ?? 0)
}

export async function listProducts(query: ProductListQuery) {
  const { page, pageSize, stockStatus, sortBy, sortOrder } = query
  const skip = (page - 1) * pageSize
  const orderBy: Prisma.ProductOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  }

  const baseWhere = buildWhere(query)

  if (stockStatus === "low") {
    const candidates = await prisma.product.findMany({
      where: {
        ...baseWhere,
        stockQuantity: { gt: 0 },
      },
      orderBy,
    })

    const filtered = candidates.filter(
      (p) => p.stockQuantity <= p.lowStockThreshold
    )
    const total = filtered.length
    const pageItems = filtered.slice(skip, skip + pageSize)

    const [categories, lowStockCount] = await Promise.all([
      getProductCategories(),
      countLowStockProducts(),
    ])

    return {
      items: pageItems.map(serializeProduct),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      categories,
      lowStockCount,
    }
  }

  const [items, total, categories, lowStockCount] = await Promise.all([
    prisma.product.findMany({
      where: baseWhere,
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.product.count({ where: baseWhere }),
    getProductCategories(),
    countLowStockProducts(),
  ])

  return {
    items: items.map(serializeProduct),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    categories,
    lowStockCount,
  }
}

export async function getProductCategories() {
  const rows = await prisma.product.findMany({
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  })
  return rows.map((r) => r.category)
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({ where: { id } })
  return product ? serializeProduct(product) : null
}

export async function listStockMovements(
  productId: string,
  page: number,
  pageSize: number
) {
  const skip = (page - 1) * pageSize

  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.stockMovement.count({ where: { productId } }),
  ])

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}
