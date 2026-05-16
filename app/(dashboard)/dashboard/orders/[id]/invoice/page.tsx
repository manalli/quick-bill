import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { InvoicePageClient } from "@/components/orders/invoice-page-client"
import { getOrderById } from "@/lib/orders/queries"

export const metadata: Metadata = {
  title: "Invoice",
}

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function InvoicePage({ params, searchParams }: PageProps) {
  const { id } = await params
  const sp = await searchParams
  const order = await getOrderById(id)

  if (!order) notFound()

  const autoPrint = sp.print === "1" || sp.print === "true"

  return <InvoicePageClient order={order} autoPrint={autoPrint} />
}
