import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export const metadata: Metadata = {
  title: "Overview · QuickBill",
}

export default async function DashboardRouteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <DashboardShell
      userEmail={session.user.email}
      userName={session.user.name ?? null}
      userRole={session.user.role}
    >
      {children}
    </DashboardShell>
  )
}
