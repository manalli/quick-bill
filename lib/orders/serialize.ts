import type { Order, OrderItem, User } from "@prisma/client"
import type { DiscountType, OrderStatus, PaymentMethod } from "@/types/order"
import { decimalToNumber } from "@/lib/actions/utils"

export type SerializedOrderItem = {
  id: string
  productId: string
  productName: string
  productSku: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export type SerializedOrder = {
  id: string
  orderNumber: string
  status: OrderStatus
  customerName: string | null
  customerPhone: string | null
  subtotal: number
  discountType: DiscountType | null
  discountValue: number
  discountAmount: number
  taxRate: number
  taxAmount: number
  total: number
  paymentMethod: PaymentMethod
  notes: string | null
  createdAt: string
  cancelledAt: string | null
  cancelReason: string | null
  createdBy: { id: string; name: string | null; email: string }
  cancelledBy: { id: string; name: string | null; email: string } | null
  items: SerializedOrderItem[]
}

type OrderWithRelations = Order & {
  items: OrderItem[]
  createdBy: Pick<User, "id" | "name" | "email">
  cancelledBy: Pick<User, "id" | "name" | "email"> | null
}

export function serializeOrderItem(item: OrderItem): SerializedOrderItem {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    productSku: item.productSku,
    unitPrice: decimalToNumber(item.unitPrice),
    quantity: item.quantity,
    lineTotal: decimalToNumber(item.lineTotal),
  }
}

export function serializeOrder(order: OrderWithRelations): SerializedOrder {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    subtotal: decimalToNumber(order.subtotal),
    discountType: order.discountType,
    discountValue: decimalToNumber(order.discountValue),
    discountAmount: decimalToNumber(order.discountAmount),
    taxRate: decimalToNumber(order.taxRate),
    taxAmount: decimalToNumber(order.taxAmount),
    total: decimalToNumber(order.total),
    paymentMethod: order.paymentMethod,
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    cancelReason: order.cancelReason,
    createdBy: {
      id: order.createdBy.id,
      name: order.createdBy.name,
      email: order.createdBy.email,
    },
    cancelledBy: order.cancelledBy
      ? {
          id: order.cancelledBy.id,
          name: order.cancelledBy.name,
          email: order.cancelledBy.email,
        }
      : null,
    items: order.items.map(serializeOrderItem),
  }
}
