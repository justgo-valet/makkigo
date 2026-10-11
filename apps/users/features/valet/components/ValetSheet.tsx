"use client";

import { Button, FieldError } from "@makkigo/ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@makkigo/ui/components/ui/sheet";

import type { ReactNode } from "react";

interface ValetSheetProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  isConfirmDisabled?: boolean;
  errorMessage?: string | null;
  children?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ValetSheet({
  open,
  title,
  description,
  confirmLabel = "확인",
  isConfirmDisabled = false,
  errorMessage = null,
  children,
  onConfirm,
  onClose,
}: Readonly<ValetSheetProps>) {
  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-h-[90dvh] max-w-md gap-0 rounded-t-2xl"
      >
        <div aria-hidden className="mx-auto mt-3 h-1 w-9 shrink-0 rounded-full bg-border" />
        <div className="flex min-h-0 flex-col overflow-y-auto">
          <SheetHeader className="gap-2 px-5 pt-5 pb-0">
            <SheetTitle className="text-lg font-bold break-keep text-(--base-color)">
              {title}
            </SheetTitle>
            <SheetDescription
              className={description ? "text-sm break-keep text-(--tertiary-color)" : "sr-only"}
            >
              {description ?? title}
            </SheetDescription>
          </SheetHeader>
          {children && <div className="px-5 pt-5">{children}</div>}
        </div>
        <SheetFooter className="px-5 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <FieldError>{errorMessage}</FieldError>
          <Button
            type="button"
            size="lg"
            className="h-12 w-full shadow-none"
            disabled={isConfirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
