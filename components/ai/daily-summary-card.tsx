"use client"

import { useCallback, useState } from "react"
import { Loader2Icon, RefreshCwIcon, SparklesIcon } from "lucide-react"
import { fetchAiEndpoint } from "@/lib/ai/client-fetch"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type SummaryResponse = {
  success: true
  summary: string
  meta: { provider: string; model: string; generatedAt: string }
}

export function DailySummaryCard() {
  const [summary, setSummary] = useState<string | null>(null)
  const [meta, setMeta] = useState<SummaryResponse["meta"] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await fetchAiEndpoint<SummaryResponse>("/api/ai/daily-summary", {
      maxRetries: 2,
    })

    setLoading(false)

    if ("error" in result) {
      setError(result.error.message)
      return
    }

    if (!result.data.success) {
      setError("Could not generate summary.")
      return
    }

    setSummary(result.data.summary)
    setMeta(result.data.meta)
  }, [])

  return (
    <section className="overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-card to-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-violet-500/15 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/20 text-violet-700 dark:text-violet-200">
            <SparklesIcon className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-semibold tracking-tight">AI daily briefing</h2>
            <p className="text-muted-foreground text-xs">
              Plain-language summary of today&apos;s sales and stock signals
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-2 border-violet-500/30"
          disabled={loading}
          onClick={generate}
        >
          {loading ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCwIcon className="size-4" aria-hidden />
          )}
          {summary ? "Refresh" : "Generate briefing"}
        </Button>
      </div>

      <div className="px-5 py-4">
        {loading && !summary && (
          <div className="space-y-3" aria-live="polite" aria-busy="true">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[92%]" />
            <Skeleton className="h-4 w-[78%]" />
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <Loader2Icon className="size-3.5 animate-spin" />
              Analyzing sales and inventory…
            </p>
          </div>
        )}

        {!loading && !summary && !error && (
          <p className="text-muted-foreground text-sm leading-relaxed">
            Tap <strong className="text-foreground font-medium">Generate briefing</strong> for
            an AI summary like: &quot;Electronics sales increased 18% today. 4 products are low
            in stock.&quot;
          </p>
        )}

        {error && (
          <div
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {error}
            <Button
              type="button"
              variant="link"
              className="text-destructive mt-2 h-auto p-0"
              onClick={generate}
            >
              Try again
            </Button>
          </div>
        )}

        {summary && (
          <blockquote
            className={cn(
              "text-foreground text-sm leading-relaxed sm:text-[0.9375rem]",
              loading && "opacity-60"
            )}
          >
            {summary}
          </blockquote>
        )}

        {meta && (
          <p className="text-muted-foreground mt-3 text-[10px] tabular-nums">
            Generated {new Date(meta.generatedAt).toLocaleString()} · {meta.provider} /{" "}
            {meta.model}
          </p>
        )}
      </div>
    </section>
  )
}
