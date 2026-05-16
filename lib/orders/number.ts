import { format } from "date-fns"
import type { Prisma } from "@prisma/client"

type Tx = Prisma.TransactionClient

export async function generateOrderNumber(tx: Tx) {
  const day = format(new Date(), "yyyyMMdd")
  const prefix = `QB-${day}-`

  const latest = await tx.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  })

  let seq = 1
  if (latest?.orderNumber) {
    const tail = latest.orderNumber.slice(prefix.length)
    const parsed = Number.parseInt(tail, 10)
    if (!Number.isNaN(parsed)) seq = parsed + 1
  }

  return `${prefix}${String(seq).padStart(4, "0")}`
}
