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

interface ValetNoticeSheetProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  closeLabel?: string;
  pendingLabel?: string;
  isPending?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ValetNoticeSheet({
  open,
  title,
  description,
  confirmLabel,
  closeLabel,
  pendingLabel,
  isPending = false,
  errorMessage,
  onConfirm,
  onClose,
}: Readonly<ValetNoticeSheetProps>) {
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
        className="mx-auto max-w-md gap-0 rounded-t-2xl"
      >
        <div aria-hidden className="mx-auto mt-3 h-1 w-9 rounded-full bg-border" />
        <SheetHeader className="gap-2 px-5 pt-4">
          <SheetTitle className="text-lg font-bold break-keep text-(--base-color)">
            {title}
          </SheetTitle>
          <SheetDescription className="text-sm break-keep text-(--tertiary-color)">
            {description}
          </SheetDescription>
        </SheetHeader>
        <SheetFooter className="px-5 pt-4 pb-6">
          {errorMessage && <FieldError>{errorMessage}</FieldError>}
          <Button
            type="button"
            size="lg"
            className="h-12 w-full shadow-none"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending && pendingLabel ? pendingLabel : confirmLabel}
          </Button>
          {closeLabel && (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="h-12 w-full text-(--tertiary-color)"
              disabled={isPending}
              onClick={onClose}
            >
              {closeLabel}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
