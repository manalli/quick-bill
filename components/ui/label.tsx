import * as React from "react"

import { cn } from "@/lib/utils"

function Label({
  className,
  htmlFor,
  ...props
}: React.ComponentProps<"label">) {
  return (
    <label
      htmlFor={htmlFor}
      data-slot="label"
      className={cn("text-muted-foreground text-[0.8125rem] leading-none font-medium", className)}
      {...props}
    />
  )
}

export { Label }
