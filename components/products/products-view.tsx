"use client"

import Image from "next/image"
import { useCallback, useEffect, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertTriangleIcon,
  MoreHorizontalIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  WarehouseIcon,
} from "lucide-react"
import { deleteProductAction, getProductsAction } from "@/lib/actions/products"
import type { SerializedProduct } from "@/lib/products/serialize"
import {
  productListQuerySchema,
  type ProductListQuery,
} from "@/lib/validations/product"
import { formatCurrency } from "@/lib/format"
import { toast } from "@/lib/toasts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ProductFilters } from "@/components/products/product-filters"
import { ProductFormDialog } from "@/components/products/product-form-dialog"
import { InventoryDialog } from "@/components/products/inventory-dialog"
import { StockBadge } from "@/components/products/stock-badge"
import { cn } from "@/lib/utils"

type ListData = Awaited<
  ReturnType<typeof import("@/lib/products/queries").listProducts>
>

type Props = {
  initialData: ListData
  initialQuery: ProductListQuery
}

export function ProductsView({ initialData, initialQuery }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState(initialData)
  const [query, setQuery] = useState(initialQuery)
  const [loading, startLoading] = useTransition()
  const [pendingDelete, startDelete] = useTransition()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SerializedProduct | null>(null)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [inventoryProduct, setInventoryProduct] = useState<SerializedProduct | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SerializedProduct | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const syncUrl = useCallback(
    (next: ProductListQuery) => {
      const params = new URLSearchParams()
      if (next.page !== 1) params.set("page", String(next.page))
      if (next.pageSize !== 10) params.set("pageSize", String(next.pageSize))
      if (next.search) params.set("search", next.search)
      if (next.category) params.set("category", next.category)
      if (next.stockStatus !== "all") params.set("stockStatus", next.stockStatus)
      if (next.sortBy !== "createdAt") params.set("sortBy", next.sortBy)
      if (next.sortOrder !== "desc") params.set("sortOrder", next.sortOrder)

      const qs = params.toString()
      router.replace(qs ? `/dashboard/products?${qs}` : "/dashboard/products", {
        scroll: false,
      })
    },
    [router]
  )

  const fetchProducts = useCallback(
    (nextQuery: ProductListQuery) => {
      startLoading(async () => {
        const result = await getProductsAction(nextQuery)
        if (result.success) {
          setData(result.data)
          setQuery(nextQuery)
        } else {
          toast.error(result.error)
        }
      })
    },
    []
  )

  const handleQueryChange = (patch: Partial<ProductListQuery>) => {
    const next = productListQuerySchema.parse({ ...query, ...patch })
    syncUrl(next)
    fetchProducts(next)
  }

  const refresh = useCallback(() => {
    fetchProducts(query)
    router.refresh()
  }, [fetchProducts, query, router])

  useEffect(() => {
    const timer = setTimeout(() => {
      const urlSearch = searchParams.get("search") ?? ""
      if (query.search === urlSearch) return
      const next = productListQuerySchema.parse({ ...query, page: 1 })
      syncUrl(next)
      fetchProducts(next)
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.search])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(product: SerializedProduct) {
    setEditing(product)
    setFormOpen(true)
    setOpenMenuId(null)
  }

  function openInventory(product: SerializedProduct) {
    setInventoryProduct(product)
    setInventoryOpen(true)
    setOpenMenuId(null)
  }

  function confirmDelete(product: SerializedProduct) {
    setDeleteTarget(product)
    setOpenMenuId(null)
  }

  function handleDelete() {
    if (!deleteTarget) return
    startDelete(async () => {
      const result = await deleteProductAction(deleteTarget.id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Product deleted.")
      setDeleteTarget(null)
      refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Products & inventory</h1>
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            Maintain your catalogue, monitor stock health, and audit every movement from one place.
          </p>
        </div>
        <Button className="h-11 shrink-0 gap-2" onClick={openCreate}>
          <PlusIcon className="size-4" aria-hidden />
          Add product
        </Button>
      </div>

      {data.lowStockCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" />
          <p>
            <strong className="font-semibold">{data.lowStockCount}</strong> product
            {data.lowStockCount === 1 ? "" : "s"} at or below the low-stock threshold.
            <button
              type="button"
              className="text-primary ml-2 font-semibold underline-offset-4 hover:underline"
              onClick={() => handleQueryChange({ stockStatus: "low", page: 1 })}
            >
              View low stock
            </button>
          </p>
        </div>
      )}

      <ProductFilters
        query={query}
        categories={data.categories}
        disabled={loading}
        onChange={(patch) => {
          if (patch.search !== undefined) {
            setQuery((q) => ({ ...q, search: patch.search!, page: 1 }))
            return
          }
          handleQueryChange(patch)
        }}
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="hidden md:table-cell">SKU</TableHead>
                <TableHead className="hidden lg:table-cell">Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="hidden sm:table-cell">Prices</TableHead>
                <TableHead className="w-[4.5rem] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && data.items.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-12 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center">
                    <PackageIcon className="text-muted-foreground mx-auto mb-3 size-10 opacity-50" />
                    <p className="font-medium">No products found</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Adjust filters or add your first catalogue item.
                    </p>
                    <Button className="mt-4" size="sm" onClick={openCreate}>
                      Add product
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((product) => (
                  <TableRow
                    key={product.id}
                    className={cn(
                      loading && "opacity-60",
                      product.isLowStock && "bg-amber-500/5",
                      product.isOutOfStock && "bg-destructive/5"
                    )}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="bg-muted relative size-11 shrink-0 overflow-hidden rounded-lg border">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="44px"
                              unoptimized
                            />
                          ) : (
                            <div className="text-muted-foreground grid size-full place-items-center">
                              <PackageIcon className="size-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{product.name}</p>
                          <p className="text-muted-foreground truncate text-xs md:hidden">
                            {product.sku}
                          </p>
                          {product.barcode && (
                            <p className="text-muted-foreground truncate font-mono text-[10px]">
                              {product.barcode}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs md:table-cell">
                      {product.sku}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="secondary">{product.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <StockBadge product={product} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="text-xs leading-relaxed">
                        <div>Sell {formatCurrency(product.sellingPrice)}</div>
                        <div className="text-muted-foreground">
                          Cost {formatCurrency(product.costPrice)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="relative inline-block">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label="Actions"
                          onClick={() =>
                            setOpenMenuId((id) => (id === product.id ? null : product.id))
                          }
                        >
                          <MoreHorizontalIcon className="size-4" />
                        </Button>
                        {openMenuId === product.id && (
                          <>
                            <button
                              type="button"
                              className="fixed inset-0 z-40"
                              aria-label="Close menu"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="border-border absolute right-0 z-50 mt-1 w-44 rounded-lg border bg-popover p-1 shadow-lg">
                              <button
                                type="button"
                                className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm"
                                onClick={() => openEdit(product)}
                              >
                                <PencilIcon className="size-3.5" /> Edit
                              </button>
                              <button
                                type="button"
                                className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm"
                                onClick={() => openInventory(product)}
                              >
                                <WarehouseIcon className="size-3.5" /> Inventory
                              </button>
                              <button
                                type="button"
                                className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm"
                                onClick={() => confirmDelete(product)}
                              >
                                <Trash2Icon className="size-3.5" /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="border-border flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs">
            Showing{" "}
            {data.total === 0
              ? 0
              : `${(data.page - 1) * data.pageSize + 1}–${Math.min(data.page * data.pageSize, data.total)}`}{" "}
            of {data.total}
          </p>
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-lg border border-input bg-background px-2 text-xs"
              value={query.pageSize}
              disabled={loading}
              onChange={(e) =>
                handleQueryChange({ pageSize: Number(e.target.value), page: 1 })
              }
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={query.page <= 1 || loading}
              onClick={() => handleQueryChange({ page: query.page - 1 })}
            >
              Previous
            </Button>
            <span className="text-muted-foreground text-xs tabular-nums">
              {data.page} / {data.totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={query.page >= data.totalPages || loading}
              onClick={() => handleQueryChange({ page: query.page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        onSuccess={refresh}
      />

      <InventoryDialog
        open={inventoryOpen}
        onOpenChange={setInventoryOpen}
        product={inventoryProduct}
        onSuccess={refresh}
      />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete product?</DialogTitle>
            <DialogDescription>
              This removes <strong>{deleteTarget?.name}</strong> and its inventory history. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={pendingDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={pendingDelete}>
              {pendingDelete ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
