import { Prisma } from "@prisma/client"

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export function actionError(message: string): ActionResult<never> {
  return { success: false, error: message }
}

export function actionSuccess<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

export function prismaUniqueMessage(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = error.meta?.target
    if (Array.isArray(target)) {
      if (target.includes("sku")) return "A product with this SKU already exists."
      if (target.includes("name")) return "A product with this name already exists."
      if (target.includes("barcode")) return "A product with this barcode already exists."
    }
    return "A product with these details already exists."
  }
  return null
}

export function decimalToNumber(value: Prisma.Decimal | number) {
  return typeof value === "number" ? value : value.toNumber()
}
