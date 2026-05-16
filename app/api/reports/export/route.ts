import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { buildReportWorkbook } from "@/lib/reports/excel"
import {
  analyticsFiltersSchema,
  reportTypeSchema,
} from "@/lib/validations/analytics"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const type = reportTypeSchema.parse(body.type)
    const filters = analyticsFiltersSchema.parse(body.filters)

    const buffer = await buildReportWorkbook(type, filters)
    const filename = `quickbill-${type}-${filters.dateFrom}-to-${filters.dateTo}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("[reports/export]", error)
    return NextResponse.json({ error: "Export failed" }, { status: 400 })
  }
}
