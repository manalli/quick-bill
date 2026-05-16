import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { AiServiceError, produceDailySummary } from "@/lib/ai/services"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await produceDailySummary()
    return NextResponse.json({
      success: true,
      summary: result.summary,
      meta: result.meta,
    })
  } catch (error) {
    if (error instanceof AiServiceError) {
      const status = error.code === "NOT_CONFIGURED" ? 503 : 502
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status }
      )
    }
    console.error("[api/ai/daily-summary]", error)
    return NextResponse.json(
      { success: false, error: "Unable to generate summary. Please try again." },
      { status: 500 }
    )
  }
}
