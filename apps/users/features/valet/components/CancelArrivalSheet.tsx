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

interface CancelArrivalSheetProps {
  open: boolean;
  isCancelling: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export default function CancelArrivalSheet({
  open,
  isCancelling,
  errorMessage,
  onConfirm,
  onClose,
}: Readonly<CancelArrivalSheetProps>) {
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
            도착 알림을 취소할까요?
          </SheetTitle>
          <SheetDescription className="text-sm break-keep text-(--tertiary-color)">
            도착 알림을 받은 발렛 요원님께 취소했다고 알려요
          </SheetDescription>
        </SheetHeader>
        <SheetFooter className="px-5 pt-4 pb-6">
          <FieldError>{errorMessage}</FieldError>
          <Button
            type="button"
            size="lg"
            className="h-12 w-full shadow-none"
            disabled={isCancelling}
            onClick={onConfirm}
          >
            {isCancelling ? "취소하는 중…" : "도착 알림 취소하기"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="h-12 w-full text-(--tertiary-color)"
            disabled={isCancelling}
            onClick={onClose}
          >
            닫기
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
