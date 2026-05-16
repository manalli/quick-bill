"use client"

import { Toaster } from "react-hot-toast"
import { SessionProvider } from "@/components/providers/session-provider"
import { StoreHydration } from "@/components/store-hydration"

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <StoreHydration />
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className:
            "!bg-popover !text-popover-foreground !border-border !rounded-lg !shadow-lg !text-sm",
        }}
      />
    </SessionProvider>
  )
}
