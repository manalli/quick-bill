import { AlertTriangleIcon, PackageIcon, PackageXIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { SerializedProduct } from "@/lib/products/serialize"

export function StockBadge({ product }: { product: Pick<SerializedProduct, "stockQuantity" | "lowStockThreshold" | "isLowStock" | "isOutOfStock"> }) {
  if (product.isOutOfStock) {
    return (
      <Badge variant="destructive" className="gap-1">
        <PackageXIcon className="size-3" aria-hidden />
        Out of stock
      </Badge>
    )
  }

  if (product.isLowStock) {
    return (
      <Badge variant="warning" className="gap-1">
        <AlertTriangleIcon className="size-3" aria-hidden />
        Low ({product.stockQuantity})
      </Badge>
    )
  }

  return (
    <Badge variant="success" className="gap-1">
      <PackageIcon className="size-3" aria-hidden />
      {product.stockQuantity} in stock
    </Badge>
  )
}
