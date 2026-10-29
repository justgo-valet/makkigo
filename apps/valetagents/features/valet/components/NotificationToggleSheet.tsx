"use client";

import { Button, FieldError } from "@makkigo/ui";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
} from "@makkigo/ui/components/ui/bottom-sheet";

interface NotificationToggleSheetProps {
  open: boolean;
  enabled: boolean;
  hasWorkTime: boolean;
  isPending: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export default function NotificationToggleSheet({
  open,
  enabled,
  hasWorkTime,
  isPending,
  errorMessage,
  onConfirm,
  onClose,
}: Readonly<NotificationToggleSheetProps>) {
  const description = enabled
    ? "다음 출근 시간에 알림이 자동으로 켜져요"
    : "다음 퇴근 시간에 알림이 자동으로 꺼져요";

  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheetContent>
        <BottomSheetHeader
          title={enabled ? "알림 끄기" : "알림 켜기"}
          description={hasWorkTime ? description : "확인을 누르면 알림 설정이 바뀌어요."}
        />
        {errorMessage && <FieldError className="px-5 pt-3">{errorMessage}</FieldError>}
        <BottomSheetFooter className="flex-row pt-6">
          <Button
            type="button"
            variant="outline"
            size="xl"
            className="flex-1 text-(--tertiary-color)"
            onClick={onClose}
          >
            취소
          </Button>
          <Button type="button" size="xl" className="flex-1" disabled={isPending} onClick={onConfirm}>
            확인
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
