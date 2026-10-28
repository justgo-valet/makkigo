"use client";

import { Button, FieldError } from "@makkigo/ui";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetFooter,
} from "@makkigo/ui/components/ui/bottom-sheet";
import { SheetDescription, SheetHeader, SheetTitle } from "@makkigo/ui/components/ui/sheet";

interface WithdrawSheetProps {
  open: boolean;
  isWithdrawing: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

const WITHDRAW_NOTICES = [
  "연결된 소셜 계정이 바로 해제되고, 모든 기기에서 로그아웃돼요.",
  "휴대폰 번호와 차량 정보는 분쟁 대응을 위해 30일 동안 보관한 뒤 삭제해요. 그동안은 같은 번호로 다시 가입할 수 없어요.",
  "약관 동의 기록과 지난 발렛 기록은 법령에 따라 보관돼요.",
] as const;

export default function WithdrawSheet({
  open,
  isWithdrawing,
  errorMessage,
  onConfirm,
  onClose,
}: Readonly<WithdrawSheetProps>) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheetContent>
        <SheetHeader className="gap-3 px-5 pt-4">
          <SheetTitle className="text-lg font-bold text-(--base-color)">
            정말 탈퇴할까요?
          </SheetTitle>
          <SheetDescription asChild>
            <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm break-keep text-(--tertiary-color)">
              {WITHDRAW_NOTICES.map((notice) => (
                <li key={notice}>{notice}</li>
              ))}
            </ul>
          </SheetDescription>
        </SheetHeader>
        {errorMessage && <FieldError className="px-5 pt-3">{errorMessage}</FieldError>}
        <BottomSheetFooter>
          <Button
            type="button"
            variant="destructive"
            size="xl"
            className="w-full"
            disabled={isWithdrawing}
            onClick={onConfirm}
          >
            {isWithdrawing ? "탈퇴하는 중…" : "탈퇴하기"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xl"
            className="w-full text-(--tertiary-color)"
            onClick={onClose}
          >
            취소
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
