import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<any, any>(({ className, value, ...props }, ref) => // eslint-disable-line @typescript-eslint/no-explicit-any
  React.createElement(ProgressPrimitive.Root as any, { // eslint-disable-line @typescript-eslint/no-explicit-any
    ref,
    className: cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
      className
    ),
    ...props
  }, 
    React.createElement(ProgressPrimitive.Indicator as any, { // eslint-disable-line @typescript-eslint/no-explicit-any
      className: "h-full w-full flex-1 bg-primary transition-all",
      style: { transform: `translateX(-${100 - (value || 0)}%)` }
    })
  )
)
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
