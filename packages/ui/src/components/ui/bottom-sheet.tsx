"use client"

import * as React from "react"
import { cn } from "cn"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "./sheet"

function BottomSheet({
  onClose,
  ...props
}: Omit<React.ComponentProps<typeof Sheet>, "onOpenChange"> & { onClose: () => void }) {
  return (
    <Sheet
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
      {...props}
    />
  )
}

function BottomSheetContent({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof SheetContent>, "side" | "showCloseButton">) {
  return (
    <SheetContent
      side="bottom"
      showCloseButton={false}
      className={cn("mx-auto max-w-md gap-0 rounded-t-2xl", className)}
      {...props}
    >
      <div aria-hidden className="mx-auto mt-3 h-1 w-9 shrink-0 rounded-full bg-border" />
      {children}
    </SheetContent>
  )
}

function BottomSheetHeader({
  title,
  description,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  className?: string
}) {
  return (
    <SheetHeader className={cn("gap-2 px-5 pt-4", className)}>
      <SheetTitle className="text-lg font-bold break-keep text-(--base-color)">{title}</SheetTitle>
      <SheetDescription
        className={description ? "text-sm break-keep text-(--tertiary-color)" : "sr-only"}
      >
        {description ?? title}
      </SheetDescription>
    </SheetHeader>
  )
}

function BottomSheetFooter({ className, ...props }: React.ComponentProps<typeof SheetFooter>) {
  return <SheetFooter className={cn("px-5 pt-4 pb-6", className)} {...props} />
}

export { BottomSheet, BottomSheetContent, BottomSheetFooter, BottomSheetHeader }
