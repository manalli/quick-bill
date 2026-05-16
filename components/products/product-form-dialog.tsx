"use client"

import { useEffect, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createProductAction, updateProductAction } from "@/lib/actions/products"
import type { SerializedProduct } from "@/lib/products/serialize"
import { toast } from "@/lib/toasts"

type FormState = {
  name: string
  sku: string
  category: string
  barcode: string
  costPrice: string
  sellingPrice: string
  stockQuantity: string
  lowStockThreshold: string
  description: string
  imageUrl: string
}

const emptyForm: FormState = {
  name: "",
  sku: "",
  category: "",
  barcode: "",
  costPrice: "",
  sellingPrice: "",
  stockQuantity: "0",
  lowStockThreshold: "5",
  description: "",
  imageUrl: "",
}

function productToForm(product: SerializedProduct): FormState {
  return {
    name: product.name,
    sku: product.sku,
    category: product.category,
    barcode: product.barcode ?? "",
    costPrice: String(product.costPrice),
    sellingPrice: String(product.sellingPrice),
    stockQuantity: String(product.stockQuantity),
    lowStockThreshold: String(product.lowStockThreshold),
    description: product.description ?? "",
    imageUrl: product.imageUrl ?? "",
  }
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: SerializedProduct | null
  onSuccess: () => void
}

export function ProductFormDialog({ open, onOpenChange, product, onSuccess }: Props) {
  const isEdit = Boolean(product)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setForm(product ? productToForm(product) : emptyForm)
      setFieldError(null)
    }
  }, [open, product])

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldError(null)

    const payload = {
      name: form.name,
      sku: form.sku,
      category: form.category,
      barcode: form.barcode || null,
      costPrice: form.costPrice,
      sellingPrice: form.sellingPrice,
      stockQuantity: isEdit ? (product?.stockQuantity ?? 0) : form.stockQuantity,
      lowStockThreshold: form.lowStockThreshold,
      description: form.description,
      imageUrl: form.imageUrl || null,
    }

    startTransition(async () => {
      const result = isEdit
        ? await updateProductAction({ ...payload, id: product!.id })
        : await createProductAction(payload)

      if (!result.success) {
        setFieldError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(isEdit ? "Product updated." : "Product created.")
      onOpenChange(false)
      onSuccess()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit product" : "Add product"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update catalogue details. Use inventory tools to change stock levels."
              : "Create a catalogue item. Stock changes are logged automatically."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              disabled={pending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU *</Label>
            <Input
              id="sku"
              value={form.sku}
              onChange={(e) => updateField("sku", e.target.value.toUpperCase())}
              disabled={pending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Input
              id="category"
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              disabled={pending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode</Label>
            <Input
              id="barcode"
              value={form.barcode}
              onChange={(e) => updateField("barcode", e.target.value)}
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              type="url"
              placeholder="https://…"
              value={form.imageUrl}
              onChange={(e) => updateField("imageUrl", e.target.value)}
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="costPrice">Cost price (₹) *</Label>
            <Input
              id="costPrice"
              type="number"
              min={0}
              step="0.01"
              value={form.costPrice}
              onChange={(e) => updateField("costPrice", e.target.value)}
              disabled={pending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sellingPrice">Selling price (₹) *</Label>
            <Input
              id="sellingPrice"
              type="number"
              min={0}
              step="0.01"
              value={form.sellingPrice}
              onChange={(e) => updateField("sellingPrice", e.target.value)}
              disabled={pending}
              required
            />
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="stockQuantity">Initial stock</Label>
              <Input
                id="stockQuantity"
                type="number"
                min={0}
                step={1}
                value={form.stockQuantity}
                onChange={(e) => updateField("stockQuantity", e.target.value)}
                disabled={pending}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="lowStockThreshold">Low stock threshold</Label>
            <Input
              id="lowStockThreshold"
              type="number"
              min={0}
              step={1}
              value={form.lowStockThreshold}
              onChange={(e) => updateField("lowStockThreshold", e.target.value)}
              disabled={pending}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              disabled={pending}
              rows={3}
            />
          </div>

          {fieldError && (
            <p className="text-destructive text-sm sm:col-span-2" role="alert">
              {fieldError}
            </p>
          )}

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
