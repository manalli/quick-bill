"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { DashboardAnalytics } from "@/lib/analytics/queries"
import { formatCurrency } from "@/lib/format"

const PIE_COLORS = [
  "hsl(160 55% 42%)",
  "hsl(200 70% 48%)",
  "hsl(38 90% 52%)",
  "hsl(280 55% 55%)",
  "hsl(12 75% 55%)",
  "hsl(220 20% 55%)",
]

type Props = {
  data: DashboardAnalytics
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="font-semibold tracking-tight">{title}</h3>
        {subtitle && (
          <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p>
        )}
      </div>
      <div className="h-64 w-full min-w-0">{children}</div>
    </div>
  )
}

export function DashboardCharts({ data }: Props) {
  const monthly = data.monthlyTrends.map((m) => ({
    ...m,
    label: m.month,
  }))

  const categories = data.categoryPerformance.slice(0, 6)

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartCard title="Monthly revenue trend" subtitle="Completed orders in selected period">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
            <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="hsl(160 55% 42%)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="orders"
              name="Orders"
              stroke="hsl(200 70% 48%)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Category performance" subtitle="Revenue by product category">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={categories} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
            <YAxis type="category" dataKey="category" width={90} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
            <Bar dataKey="revenue" name="Revenue" fill="hsl(160 55% 42%)" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Sales mix by category" subtitle="Share of filtered revenue">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categories}
              dataKey="revenue"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={88}
              label={({ name, percent }) =>
                `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
            >
              {categories.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top products" subtitle="Units sold in period">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.topProducts}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="quantity" name="Units" fill="hsl(200 70% 48%)" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
