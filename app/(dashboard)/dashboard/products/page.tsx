import type { Metadata } from "next"
import { Suspense } from "react"
import { ProductsView } from "@/components/products/products-view"
import { listProducts } from "@/lib/products/queries"
import { productListQuerySchema } from "@/lib/validations/product"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata: Metadata = {
  title: "Products",
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function parseSearchParams(raw: Record<string, string | string[] | undefined>) {
  const first = (key: string) => {
    const v = raw[key]
    return Array.isArray(v) ? v[0] : v
  }

  return productListQuerySchema.parse({
    page: first("page"),
    pageSize: first("pageSize"),
    search: first("search"),
    category: first("category"),
    stockStatus: first("stockStatus"),
    sortBy: first("sortBy"),
    sortOrder: first("sortOrder"),
  })
}

async function ProductsPageContent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const query = parseSearchParams(searchParams)
  const data = await listProducts(query)

  return <ProductsView initialData={data} initialQuery={query} />
}

function ProductsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  )
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams

  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsPageContent searchParams={params} />
    </Suspense>
  )
}
