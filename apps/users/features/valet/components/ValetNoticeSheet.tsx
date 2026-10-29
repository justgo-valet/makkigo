"use client";

import { Button, FieldError } from "@makkigo/ui";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
} from "@makkigo/ui/components/ui/bottom-sheet";

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
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheetContent>
        <BottomSheetHeader title={title} description={description} />
        <BottomSheetFooter>
          {errorMessage && <FieldError>{errorMessage}</FieldError>}
          <Button
            type="button"
            size="xl"
            className="w-full"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending && pendingLabel ? pendingLabel : confirmLabel}
          </Button>
          {closeLabel && (
            <Button
              type="button"
              variant="ghost"
              size="xl"
              className="w-full text-(--tertiary-color)"
              disabled={isPending}
              onClick={onClose}
            >
              {closeLabel}
            </Button>
          )}
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
