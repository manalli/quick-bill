import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"

import { AppProviders } from "@/components/providers/app-providers"

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: {
    default: "QuickBill POS",
    template: "%s · QuickBill",
  },
  description:
    "QuickBill POS keeps storefront staff aligned with trusted inventory counts, invoicing fidelity, and business intelligence tailored for SMB retail.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} h-full scroll-smooth`}>
      <body className={`${sans.variable} text-foreground min-h-full bg-background antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
