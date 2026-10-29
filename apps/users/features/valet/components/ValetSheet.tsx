"use client";

import { Button, FieldError } from "@makkigo/ui";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
} from "@makkigo/ui/components/ui/bottom-sheet";

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
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheetContent className="max-h-[90dvh]">
        <div className="flex min-h-0 flex-col overflow-y-auto">
          <BottomSheetHeader title={title} description={description} className="pt-5 pb-0" />
          {children && <div className="px-5 pt-5">{children}</div>}
        </div>
        <BottomSheetFooter className="pt-5">
          <FieldError>{errorMessage}</FieldError>
          <Button
            type="button"
            size="xl"
            className="w-full"
            disabled={isConfirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
