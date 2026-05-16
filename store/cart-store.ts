import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { getDefaultTaxRate } from "@/lib/orders/calculations"
import type { DiscountType, PaymentMethod } from "@/types/order"

export type PosProduct = {
  id: string
  name: string
  sku: string
  category: string
  barcode: string | null
  sellingPrice: number
  stockQuantity: number
  lowStockThreshold: number
  imageUrl: string | null
  isLowStock: boolean
  isOutOfStock: boolean
}

export type CartItem = {
  product: PosProduct
  quantity: number
}

type CartState = {
  items: CartItem[]
  discountType: DiscountType | null
  discountValue: number
  taxRate: number
  paymentMethod: PaymentMethod
  customerName: string
  customerPhone: string
  notes: string

  addProduct: (product: PosProduct, qty?: number) => void
  setQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clearCart: () => void
  setDiscount: (type: DiscountType | null, value: number) => void
  setTaxRate: (rate: number) => void
  setPaymentMethod: (method: PaymentMethod) => void
  setCustomer: (name: string, phone: string) => void
  setNotes: (notes: string) => void
  getCartQuantity: (productId: string) => number
}

const defaultTaxRate = getDefaultTaxRate()

const initialCheckoutFields = {
  discountType: null as DiscountType | null,
  discountValue: 0,
  taxRate: defaultTaxRate,
  paymentMethod: "CASH" as PaymentMethod,
  customerName: "",
  customerPhone: "",
  notes: "",
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      ...initialCheckoutFields,

      addProduct: (product, qty = 1) => {
        if (product.isOutOfStock || qty <= 0) return

        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id)
          const requested = (existing?.quantity ?? 0) + qty
          const capped = Math.min(requested, product.stockQuantity)
          if (capped <= 0) return state

          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id
                  ? { ...i, product, quantity: capped }
                  : i
              ),
            }
          }

          return {
            items: [...state.items, { product, quantity: capped }],
          }
        })
      },

      setQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }

        set((state) => {
          const item = state.items.find((i) => i.product.id === productId)
          if (!item) return state

          const capped = Math.min(quantity, item.product.stockQuantity)
          if (capped <= 0) {
            return {
              items: state.items.filter((i) => i.product.id !== productId),
            }
          }

          return {
            items: state.items.map((i) =>
              i.product.id === productId ? { ...i, quantity: capped } : i
            ),
          }
        })
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
        }))
      },

      clearCart: () => {
        set({
          items: [],
          ...initialCheckoutFields,
          taxRate: get().taxRate,
        })
      },

      setDiscount: (type, value) => set({ discountType: type, discountValue: value }),
      setTaxRate: (rate) => set({ taxRate: Math.max(0, rate) }),
      setPaymentMethod: (method) => set({ paymentMethod: method }),
      setCustomer: (name, phone) => set({ customerName: name, customerPhone: phone }),
      setNotes: (notes) => set({ notes }),

      getCartQuantity: (productId) => {
        return get().items.find((i) => i.product.id === productId)?.quantity ?? 0
      },
    }),
    {
      name: "quickbill-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        discountType: state.discountType,
        discountValue: state.discountValue,
        taxRate: state.taxRate,
        paymentMethod: state.paymentMethod,
      }),
      skipHydration: true,
    }
  )
)
