import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "selection:bg-primary/20 selection:text-foreground placeholder:text-muted-foreground",
        "h-11 w-full min-w-0 rounded-lg border border-input bg-background px-4 py-2 text-sm shadow-inner transition-colors",
        "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
