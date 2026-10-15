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

interface ArrivalConfirmSheetProps {
  open: boolean;
  merchantName: string | null;
  isSending: boolean;
  errorMessage: string | null;
  onSend: () => void;
  onClose: () => void;
}

export default function ArrivalConfirmSheet({
  open,
  merchantName,
  isSending,
  errorMessage,
  onSend,
  onClose,
}: Readonly<ArrivalConfirmSheetProps>) {
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
            {merchantName}에
            <br />
            도착 알림을 보낼까요?
          </SheetTitle>
          <SheetDescription className="text-sm text-(--tertiary-color)">
            곧 도착한다고 발렛 요원님께 알려요
          </SheetDescription>
        </SheetHeader>
        <SheetFooter className="px-5 pt-4 pb-6">
          <FieldError>{errorMessage}</FieldError>
          <Button
            type="button"
            size="lg"
            className="h-12 w-full shadow-none"
            disabled={isSending}
            onClick={onSend}
          >
            {isSending ? "보내는 중…" : "도착 알림 보내기"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="h-12 w-full text-(--tertiary-color)"
            disabled={isSending}
            onClick={onClose}
          >
            나중에 할게요
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
