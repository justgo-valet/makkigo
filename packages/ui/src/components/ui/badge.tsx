import { cva, type VariantProps } from "class-variance-authority"
import type { ComponentProps } from "react"

import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex shrink-0 items-center rounded-full px-3 py-1 text-sm font-semibold",
  {
    variants: {
      tone: {
        info: "bg-primary/10 text-primary",
        success: "bg-emerald-100 text-emerald-700",
        danger: "bg-red-100 text-red-600",
        warning: "bg-amber-100 text-amber-700",
        neutral: "bg-muted text-(--tertiary-color)",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
)

function Badge({
  className,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props} />
}

export { Badge, badgeVariants }
