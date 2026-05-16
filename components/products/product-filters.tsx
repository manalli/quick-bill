"use client"

import { SearchIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ProductListQuery } from "@/lib/validations/product"
import { cn } from "@/lib/utils"

const selectClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-inner outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35"

type Props = {
  query: ProductListQuery
  categories: string[]
  disabled?: boolean
  onChange: (patch: Partial<ProductListQuery>) => void
}

export function ProductFilters({ query, categories, disabled, onChange }: Props) {
  return (
    <div className="grid gap-4 rounded-2xl border border-border bg-card/80 p-4 shadow-sm md:grid-cols-2 lg:grid-cols-5">
      <div className="space-y-2 lg:col-span-2">
        <Label htmlFor="search">Search</Label>
        <div className="relative">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            id="search"
            placeholder="Name, SKU, barcode, category…"
            className="pl-10"
            value={query.search}
            disabled={disabled}
            onChange={(e) => onChange({ search: e.target.value, page: 1 })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          className={selectClass}
          value={query.category}
          disabled={disabled}
          onChange={(e) => onChange({ category: e.target.value, page: 1 })}
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="stockStatus">Stock status</Label>
        <select
          id="stockStatus"
          className={selectClass}
          value={query.stockStatus}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              stockStatus: e.target.value as ProductListQuery["stockStatus"],
              page: 1,
            })
          }
        >
          <option value="all">All stock levels</option>
          <option value="low">Low stock only</option>
          <option value="out">Out of stock</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sortBy">Sort by</Label>
        <div className="flex gap-2">
          <select
            id="sortBy"
            className={cn(selectClass, "flex-1")}
            value={query.sortBy}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                sortBy: e.target.value as ProductListQuery["sortBy"],
              })
            }
          >
            <option value="createdAt">Date added</option>
            <option value="name">Name</option>
            <option value="sku">SKU</option>
            <option value="category">Category</option>
            <option value="stockQuantity">Stock</option>
            <option value="sellingPrice">Selling price</option>
          </select>
          <select
            aria-label="Sort order"
            className={cn(selectClass, "w-[5.5rem] shrink-0")}
            value={query.sortOrder}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                sortOrder: e.target.value as ProductListQuery["sortOrder"],
              })
            }
          >
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>
        </div>
      </div>
    </div>
  )
}
