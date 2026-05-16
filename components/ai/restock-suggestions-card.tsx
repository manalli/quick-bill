"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { Loader2Icon, PackagePlusIcon, RefreshCwIcon, SparklesIcon } from "lucide-react"
import { fetchAiEndpoint } from "@/lib/ai/client-fetch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Suggestion = {
  productId: string
  productName: string
  sku: string
  suggestedQty: number
  priority: "high" | "medium" | "low"
  reason: string
}

type RestockResponse = {
  success: true
  overview: string
  suggestions: Suggestion[]
  context: {
    lowStockCount: number
    outOfStockCount: number
    productCount: number
  }
  meta: { provider: string; model: string; generatedAt: string }
}

const priorityVariant = {
  high: "destructive" as const,
  medium: "warning" as const,
  low: "secondary" as const,
}

export function RestockSuggestionsCard() {
  const [overview, setOverview] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [meta, setMeta] = useState<RestockResponse["meta"] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await fetchAiEndpoint<RestockResponse>(
      "/api/ai/restock-suggestions",
      { maxRetries: 2 }
    )

    setLoading(false)

    if ("error" in result) {
      setError(result.error.message)
      return
    }

    if (!result.data.success) {
      setError("Could not generate suggestions.")
      return
    }

    setOverview(result.data.overview)
    setSuggestions(result.data.suggestions)
    setMeta(result.data.meta)
  }, [])

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="bg-primary/15 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
            <PackagePlusIcon className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="flex items-center gap-2 font-semibold tracking-tight">
              AI restock planner
              <SparklesIcon className="text-violet-600 size-4 dark:text-violet-300" />
            </h2>
            <p className="text-muted-foreground text-xs">
              Uses sales velocity, low stock, and recent demand
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-2"
          disabled={loading}
          onClick={generate}
        >
          {loading ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCwIcon className="size-4" aria-hidden />
          )}
          {suggestions.length ? "Refresh" : "Get suggestions"}
        </Button>
      </div>

      <div className="p-5">
        {loading && suggestions.length === 0 && (
          <div className="space-y-3" aria-live="polite" aria-busy="true">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <Loader2Icon className="size-3.5 animate-spin" />
              Reviewing velocity and stock levels…
            </p>
          </div>
        )}

        {!loading && !overview && !error && (
          <p className="text-muted-foreground text-sm leading-relaxed">
            Generate prioritized restock quantities before your next supplier run. Suggestions
            appear in the table below with reasons you can share with staff.
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

        {overview && (
          <p className="text-muted-foreground mb-4 text-sm leading-relaxed">{overview}</p>
        )}

        {suggestions.length > 0 && (
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Suggest qty</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.map((s) => (
                  <TableRow key={s.productId}>
                    <TableCell>
                      <p className="font-medium">{s.productName}</p>
                      <p className="text-muted-foreground font-mono text-[10px]">{s.sku}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={priorityVariant[s.priority]} className="capitalize">
                        {s.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      +{s.suggestedQty}
                    </TableCell>
                    <TableCell className="max-w-xs text-xs leading-relaxed">{s.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/products">Open products to restock</Link>
            </Button>
          </div>
        )}

        {meta && (
          <p className="text-muted-foreground mt-4 text-[10px] tabular-nums">
            Generated {new Date(meta.generatedAt).toLocaleString()} · {meta.provider} /{" "}
            {meta.model}
          </p>
        )}
      </div>
    </section>
  )
}
