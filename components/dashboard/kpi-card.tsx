import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

type Props = {
  title: string
  value: string
  hint?: string
  icon: LucideIcon
  tone?: "default" | "emerald" | "amber" | "sky"
}

const toneClass = {
  default: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  amber: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  sky: "bg-sky-500/15 text-sky-800 dark:text-sky-200",
}

export function KpiCard({ title, value, hint, icon: Icon, tone = "default" }: Props) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            {title}
          </p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          {hint && (
            <p className="text-muted-foreground text-xs leading-relaxed">{hint}</p>
          )}
        </div>
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-xl",
            toneClass[tone]
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
      </div>
    </article>
  )
}
