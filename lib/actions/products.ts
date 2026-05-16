"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db/prisma"
import { getRequiredSession } from "@/lib/auth/session"
import {
  actionError,
  actionSuccess,
  prismaUniqueMessage,
  type ActionResult,
} from "@/lib/actions/utils"
import {
  getProductById,
  listProducts,
  listStockMovements,
} from "@/lib/products/queries"
import { serializeMovement, serializeProduct } from "@/lib/products/serialize"
import {
  createProductSchema,
  productListQuerySchema,
  stockHistoryQuerySchema,
  updateProductSchema,
  type ProductListQuery,
} from "@/lib/validations/product"

const PRODUCTS_PATH = "/dashboard/products"

async function assertUniqueProductFields(
  data: { name: string; sku: string; barcode: string | null },
  excludeId?: string
) {
  const conflicts = await prisma.product.findFirst({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      OR: [
        { name: data.name },
        { sku: data.sku },
        ...(data.barcode ? [{ barcode: data.barcode }] : []),
      ],
    },
    select: { name: true, sku: true, barcode: true },
  })

  if (!conflicts) return null
  if (conflicts.name === data.name) return "A product with this name already exists."
  if (conflicts.sku === data.sku) return "A product with this SKU already exists."
  if (data.barcode && conflicts.barcode === data.barcode) {
    return "A product with this barcode already exists."
  }
  return "A product with these details already exists."
}

export async function getProductsAction(
  raw: Partial<ProductListQuery>
): Promise<ActionResult<Awaited<ReturnType<typeof listProducts>>>> {
  try {
    await getRequiredSession()
    const query = productListQuerySchema.parse(raw)
    const data = await listProducts(query)
    return actionSuccess(data)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return actionError("You must be signed in.")
    }
    return actionError("Failed to load products.")
  }
}

export async function createProductAction(
  input: unknown
): Promise<ActionResult<{ product: ReturnType<typeof serializeProduct> }>> {
  try {
    const session = await getRequiredSession()
    const parsed = createProductSchema.safeParse(input)
    if (!parsed.success) {
      return actionError(parsed.error.issues[0]?.message ?? "Invalid product data.")
    }

    const data = parsed.data
    const duplicateMsg = await assertUniqueProductFields({
      name: data.name,
      sku: data.sku,
      barcode: data.barcode,
    })
    if (duplicateMsg) return actionError(duplicateMsg)

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: data.name,
          sku: data.sku,
          category: data.category,
          barcode: data.barcode,
          costPrice: new Prisma.Decimal(data.costPrice),
          sellingPrice: new Prisma.Decimal(data.sellingPrice),
          stockQuantity: data.stockQuantity,
          lowStockThreshold: data.lowStockThreshold,
          description: data.description,
          imageUrl: data.imageUrl,
        },
      })

      if (data.stockQuantity > 0) {
        await tx.stockMovement.create({
          data: {
            productId: created.id,
            type: "INITIAL",
            quantityChange: data.stockQuantity,
            quantityBefore: 0,
            quantityAfter: data.stockQuantity,
            reason: "Initial stock on product creation",
            createdById: session.user.id,
          },
        })
      }

      return created
    })

    revalidatePath(PRODUCTS_PATH)
    return actionSuccess({ product: serializeProduct(product) })
  } catch (error) {
    const unique = prismaUniqueMessage(error)
    if (unique) return actionError(unique)
    return actionError("Failed to create product.")
  }
}

export async function updateProductAction(
  input: unknown
): Promise<ActionResult<{ product: ReturnType<typeof serializeProduct> }>> {
  try {
    await getRequiredSession()
    const parsed = updateProductSchema.safeParse(input)
    if (!parsed.success) {
      return actionError(parsed.error.issues[0]?.message ?? "Invalid product data.")
    }

    const { id, ...data } = parsed.data
    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) return actionError("Product not found.")

    const duplicateMsg = await assertUniqueProductFields(
      { name: data.name, sku: data.sku, barcode: data.barcode },
      id
    )
    if (duplicateMsg) return actionError(duplicateMsg)

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        sku: data.sku,
        category: data.category,
        barcode: data.barcode,
        costPrice: new Prisma.Decimal(data.costPrice),
        sellingPrice: new Prisma.Decimal(data.sellingPrice),
        lowStockThreshold: data.lowStockThreshold,
        description: data.description,
        imageUrl: data.imageUrl,
      },
    })

    revalidatePath(PRODUCTS_PATH)
    return actionSuccess({ product: serializeProduct(product) })
  } catch (error) {
    const unique = prismaUniqueMessage(error)
    if (unique) return actionError(unique)
    return actionError("Failed to update product.")
  }
}

export async function deleteProductAction(
  id: string
): Promise<ActionResult> {
  try {
    await getRequiredSession()
    if (!id) return actionError("Product not found.")

    await prisma.product.delete({ where: { id } })
    revalidatePath(PRODUCTS_PATH)
    return actionSuccess(undefined)
  } catch {
    return actionError("Failed to delete product. It may be referenced elsewhere.")
  }
}

export async function getProductAction(id: string) {
  try {
    await getRequiredSession()
    const product = await getProductById(id)
    if (!product) return actionError("Product not found.")
    return actionSuccess(product)
  } catch {
    return actionError("Failed to load product.")
  }
}

export async function getStockHistoryAction(raw: unknown) {
  try {
    await getRequiredSession()
    const parsed = stockHistoryQuerySchema.safeParse(raw)
    if (!parsed.success) {
      return actionError("Invalid history query.")
    }

    const result = await listStockMovements(
      parsed.data.productId,
      parsed.data.page,
      parsed.data.pageSize
    )

    return actionSuccess({
      ...result,
      items: result.items.map(serializeMovement),
    })
  } catch {
    return actionError("Failed to load stock history.")
  }
}
