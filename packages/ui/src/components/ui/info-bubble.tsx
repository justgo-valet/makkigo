"use client"

import * as React from "react"
import { CircleHelpIcon } from "lucide-react"
import { Popover as PopoverPrimitive } from "radix-ui"

import { cn } from "../../lib/utils"

function InfoBubble({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger
        aria-label={label}
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-(--tertiary-color) outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          className
        )}
      >
        <CircleHelpIcon aria-hidden className="size-[18px]" />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          data-slot="info-bubble"
          side="top"
          sideOffset={4}
          collisionPadding={16}
          className="z-50 max-w-[min(18rem,calc(100vw-2rem))] rounded-xl bg-slate-800 px-3.5 py-2.5 text-sm leading-relaxed break-keep text-white shadow-lg outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
        >
          {children}
          <PopoverPrimitive.Arrow width={12} height={6} className="fill-slate-800" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

export { InfoBubble }
