"use client";

import { Button, FieldError } from "@makkigo/ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@makkigo/ui/components/ui/sheet";

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
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        overlayClassName="bg-transparent"
        className="mx-auto max-w-[767px] gap-0 rounded-t-[32px] border border-[#d8d8d8] bg-[#f7f9fc] pt-[30px] pr-[27px] pb-[max(24px,var(--safe-area-inset-bottom))] pl-[28px] shadow-[0_-3px_4px_rgba(0,0,0,0.25)] data-[state=closed]:duration-150 data-[state=open]:duration-200"
      >
        <SheetHeader className="gap-[9px] p-0 text-left">
          <SheetTitle className="text-2xl leading-6 font-medium text-[#03090f]">
            {enabled ? "알림 끄기" : "알림 켜기"}
          </SheetTitle>
          <SheetDescription
            className={hasWorkTime ? "text-sm leading-6 text-[#717171]" : "sr-only"}
          >
            {hasWorkTime ? description : "확인을 누르면 알림 설정이 바뀌어요."}
          </SheetDescription>
        </SheetHeader>

        {errorMessage && <FieldError className="mt-3">{errorMessage}</FieldError>}

        <div className="mt-[45px] -ml-[8px] flex w-[345px] gap-[5px]">
          <Button
            type="button"
            className="h-12 flex-1 rounded-[6px] bg-(--secondary-color) text-lg font-medium hover:bg-(--secondary-color)"
            onClick={onClose}
          >
            취소
          </Button>
          <Button
            type="button"
            className="h-12 flex-1 rounded-[6px] text-lg font-medium"
            disabled={isPending}
            onClick={onConfirm}
          >
            확인
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
