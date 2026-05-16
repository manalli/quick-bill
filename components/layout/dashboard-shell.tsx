"use client"

import {
  ClipboardListIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  ReceiptIcon,
  ScanLineIcon,
  ShoppingBagIcon,
  FileBarChartIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types/user"

function NavLinks() {
  const pathname = usePathname()

  const items = [
    { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboardIcon },
    { href: "/dashboard/pos", label: "POS", Icon: ScanLineIcon },
    { href: "/dashboard/products", label: "Products", Icon: ClipboardListIcon },
    { href: "/dashboard/orders", label: "Orders", Icon: ShoppingBagIcon },
    { href: "/dashboard/reports", label: "Reports", Icon: FileBarChartIcon },
  ] as const

  return (
    <nav className="space-y-1">
      <p className="text-muted-foreground px-2 pb-2 text-[11px] font-semibold tracking-wide uppercase">
        Workspace
      </p>

      {items.map(({ href, label, Icon }) => {
        const active =
          href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === href || pathname.startsWith(`${href}/`)

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none ring-sidebar-ring transition-colors",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              active && "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-2 ring-ring/55"
            )}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-md border shadow-sm backdrop-blur",
                active
                  ? "border-sidebar-accent-foreground/20 bg-sidebar text-sidebar-accent-foreground"
                  : "border-border bg-card text-muted-foreground group-hover:text-foreground"
              )}
              aria-hidden
            >
              <Icon className="size-[18px]" />
            </span>
            <span className="truncate font-semibold">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function DashboardShell({
  children,
  userEmail,
  userName,
  userRole,
}: {
  children: React.ReactNode
  userEmail: string
  userName: string | null
  userRole: UserRole
}) {
  const localPart = userEmail.split("@")[0] ?? ""

  const initials = `${(userName?.trim()?.at(0) ?? userEmail.at(0) ?? "Q").toUpperCase()}${(
    localPart.at(1) ?? userEmail.at(1) ?? "B"
  ).toUpperCase()}`

  const greeting =
    new Date().getHours() < 12
      ? "morning"
      : new Date().getHours() < 18
        ? "afternoon"
        : "evening"

  return (
    <div className="bg-background grid min-h-svh w-full lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-border/80 lg:border-r bg-muted/35 supports-[backdrop-filter]:bg-muted/45 hidden backdrop-blur-lg lg:block">
        <div className="flex h-dvh flex-col gap-6 p-5">
          <div className="flex items-start gap-3 px-2">
            <div className="bg-primary text-primary-foreground ring-sidebar-ring shadow-sm flex size-10 items-center justify-center rounded-xl ring-4">
              <ReceiptIcon aria-hidden className="size-[20px]" />
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight">QuickBill POS</div>
              <div className="text-muted-foreground text-xs font-medium leading-relaxed">
                Counter-ready operations
              </div>
            </div>
          </div>

          <NavLinks />

          <div className="text-muted-foreground mt-auto px-3 text-xs leading-relaxed">
            Signed in securely. Manage catalogue and stock from Products.
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="border-border sticky top-0 z-40 border-b bg-background/70 backdrop-blur-xl">
          <div className="mx-auto flex w-full items-center gap-4 px-4 py-4 sm:px-6 lg:gap-8 lg:px-8">
            <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl shadow-sm ring-2 ring-ring/45 lg:hidden">
              <ReceiptIcon aria-hidden className="size-[20px]" />
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.2em]">
                Command center
              </div>
              <div className="truncate text-base font-semibold tracking-tight sm:text-lg">
                Good {greeting}
              </div>
              <div className="text-muted-foreground truncate text-sm">
                {userName?.trim()?.length ? userName : localPart || userEmail} · Role{" "}
                <span className="text-foreground font-semibold">{userRole}</span>
              </div>
            </div>

            <div className="bg-sidebar-primary text-sidebar-primary-foreground hidden shrink-0 items-center gap-4 rounded-xl px-5 py-2.5 text-sm shadow-sm ring ring-sidebar-accent/65 sm:flex">
              <span className="tabular-nums tracking-tighter font-semibold">{userRole}</span>
              <div className="bg-sidebar-accent/40 h-10 w-px shrink-0" aria-hidden />

              <div className="min-w-0">
                <div className="truncate font-semibold leading-tight">
                  {userName?.trim()?.length ? userName : userEmail}
                </div>
                <div className="truncate text-xs opacity-80">{userEmail}</div>
              </div>

              <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-sidebar-primary-foreground/10 text-[12px] font-bold ring-4 ring-ring/40">
                {initials}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-11 gap-2 rounded-xl border-border px-4"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOutIcon className="size-4 shrink-0" aria-hidden />
              <span className="hidden font-semibold sm:inline">Sign out</span>
            </Button>
          </div>
        </header>

        <main className="relative flex flex-1 flex-col">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-background via-background to-emerald-50/55 dark:to-emerald-950/30" />
          <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
