"use client"

import Image from "next/image"
import { PackageIcon } from "lucide-react"
import type { PosProduct } from "@/store/cart-store"
import { useCartStore } from "@/store/cart-store"
import { formatCurrency } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type Props = {
  products: PosProduct[]
  loading?: boolean
  selectedIndex: number
  onSelect: (index: number) => void
  onAdd: (product: PosProduct) => void
}

export function ProductGrid({
  products,
  loading,
  selectedIndex,
  onSelect,
  onAdd,
}: Props) {
  const cartItems = useCartStore((s) => s.items)

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <p className="text-muted-foreground py-16 text-center text-sm">
        No products match your search. Try another keyword or barcode.
      </p>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product, index) => {
        const inCart =
          cartItems.find((i) => i.product.id === product.id)?.quantity ?? 0
        const selected = index === selectedIndex

        return (
          <button
            key={product.id}
            type="button"
            onClick={() => onSelect(index)}
            onDoubleClick={() => !product.isOutOfStock && onAdd(product)}
            className={cn(
              "flex gap-3 rounded-xl border p-3 text-left transition-all outline-none",
              "hover:border-ring/60 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/40",
              selected && "border-primary ring-2 ring-ring/50 shadow-md",
              product.isOutOfStock && "opacity-60"
            )}
          >
            <div className="bg-muted relative size-14 shrink-0 overflow-hidden rounded-lg border">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="56px"
                  unoptimized
                />
              ) : (
                <div className="text-muted-foreground grid size-full place-items-center">
                  <PackageIcon className="size-5" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{product.name}</p>
              <p className="text-muted-foreground font-mono text-[10px]">{product.sku}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-semibold tabular-nums">
                  {formatCurrency(product.sellingPrice)}
                </span>
                {product.isOutOfStock ? (
                  <Badge variant="destructive" className="text-[10px]">
                    Out
                  </Badge>
                ) : product.isLowStock ? (
                  <Badge variant="warning" className="text-[10px]">
                    {product.stockQuantity} left
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-[10px]">
                    Stock {product.stockQuantity}
                  </span>
                )}
                {inCart > 0 && (
                  <Badge variant="default" className="text-[10px]">
                    Cart ×{inCart}
                  </Badge>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
