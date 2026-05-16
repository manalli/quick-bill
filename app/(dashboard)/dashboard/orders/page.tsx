import type { Metadata } from "next"
import { Suspense } from "react"
import { OrdersView } from "@/components/orders/orders-view"
import { listOrders } from "@/lib/orders/queries"
import { orderListQuerySchema } from "@/lib/validations/order"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata: Metadata = {
  title: "Orders",
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function parseParams(raw: Record<string, string | string[] | undefined>) {
  const first = (key: string) => {
    const v = raw[key]
    return Array.isArray(v) ? v[0] : v
  }
  return orderListQuerySchema.parse({
    page: first("page"),
    status: first("status"),
    search: first("search"),
  })
}

async function OrdersContent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const query = parseParams(searchParams)
  const data = await listOrders(query)
  return <OrdersView initialData={data} initialQuery={query} />
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const params = await searchParams
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      }
    >
      <OrdersContent searchParams={params} />
    </Suspense>
  )
}
