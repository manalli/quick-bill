"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { SearchIcon } from "lucide-react"
import { searchPosProductsAction } from "@/lib/actions/orders"
import type { PosProduct } from "@/store/cart-store"
import { useCartStore } from "@/store/cart-store"
import { Input } from "@/components/ui/input"
import { ProductGrid } from "@/components/pos/product-grid"
import { CartSidebar } from "@/components/pos/cart-sidebar"
import { CheckoutDialog } from "@/components/pos/checkout-dialog"
import { toast } from "@/lib/toasts"

export function PosView() {
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [products, setProducts] = useState<PosProduct[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [loading, startLoading] = useTransition()

  const addProduct = useCartStore((s) => s.addProduct)

  const loadProducts = useCallback((q: string) => {
    startLoading(async () => {
      const result = await searchPosProductsAction({ q, limit: 24 })
      if (result.success) {
        setProducts(result.data)
        setSelectedIndex(0)
      }
    })
  }, [])

  useEffect(() => {
    loadProducts("")
  }, [loadProducts])

  useEffect(() => {
    const timer = setTimeout(() => loadProducts(query), 280)
    return () => clearTimeout(timer)
  }, [query, loadProducts])

  const addSelected = useCallback(() => {
    const product = products[selectedIndex]
    if (!product) return
    if (product.isOutOfStock) {
      toast.error(`"${product.name}" is out of stock.`)
      return
    }
    addProduct(product, 1)
    toast.success(`Added ${product.name}`)
  }, [products, selectedIndex, addProduct])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      const inField = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"

      if (e.key === "/" && !inField) {
        e.preventDefault()
        searchRef.current?.focus()
        return
      }

      if (checkoutOpen) return

      if (e.key === "F9") {
        e.preventDefault()
        setCheckoutOpen(true)
        return
      }

      if (inField && e.key !== "Escape") return

      if (e.key === "Escape") {
        if (inField) {
          ;(e.target as HTMLElement).blur()
          return
        }
        return
      }

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, Math.max(0, products.length - 1)))
        return
      }

      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
        return
      }

      if (e.key === "Enter" && !inField) {
        e.preventDefault()
        addSelected()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [products.length, addSelected, checkoutOpen])

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[32rem] flex-col gap-4 lg:flex-row lg:gap-6">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Point of Sale</h1>
          <p className="text-muted-foreground text-xs">
            <kbd className="rounded border px-1">/</kbd> search ·{" "}
            <kbd className="rounded border px-1">↑↓</kbd> navigate ·{" "}
            <kbd className="rounded border px-1">Enter</kbd> add ·{" "}
            <kbd className="rounded border px-1">F9</kbd> checkout
          </p>
        </div>

        <div className="relative">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            ref={searchRef}
            className="h-12 pl-10 text-base"
            placeholder="Search name, SKU, or scan barcode…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addSelected()
              }
            }}
            autoComplete="off"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <ProductGrid
            products={products}
            loading={loading}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            onAdd={(p) => {
              if (p.isOutOfStock) {
                toast.error(`"${p.name}" is out of stock.`)
                return
              }
              addProduct(p, 1)
            }}
          />
        </div>
      </div>

      <div className="h-[min(100%,42rem)] w-full shrink-0 lg:w-[22rem] xl:w-[24rem]">
        <CartSidebar onCheckout={() => setCheckoutOpen(true)} />
      </div>

      <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </div>
  )
}
