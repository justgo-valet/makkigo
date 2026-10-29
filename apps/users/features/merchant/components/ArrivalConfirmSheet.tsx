"use client";

import { Button, FieldError } from "@makkigo/ui";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
} from "@makkigo/ui/components/ui/bottom-sheet";

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
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheetContent>
        <BottomSheetHeader
          title={
            <>
              {merchantName}에
              <br />
              도착 알림을 보낼까요?
            </>
          }
          description="곧 도착한다고 발렛 요원님께 알려요"
        />
        <BottomSheetFooter>
          <FieldError>{errorMessage}</FieldError>
          <Button type="button" size="xl" className="w-full" disabled={isSending} onClick={onSend}>
            {isSending ? "보내는 중…" : "도착 알림 보내기"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xl"
            className="w-full text-(--tertiary-color)"
            disabled={isSending}
            onClick={onClose}
          >
            나중에 할게요
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
