"use client";

import { Button, FieldError } from "@makkigo/ui";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetFooter,
} from "@makkigo/ui/components/ui/bottom-sheet";
import { SheetDescription, SheetHeader, SheetTitle } from "@makkigo/ui/components/ui/sheet";

import type { MenuAccess } from "@/libs/auth/menuItems";

interface WithdrawSheetProps {
  open: boolean;
  menu: MenuAccess;
  isWithdrawing: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

const getWithdrawNotices = ({ role, managedBoothId }: MenuAccess) => [
  "연결된 소셜 계정이 바로 해제되고, 모든 기기에서 로그아웃돼요.",
  ...(managedBoothId === null
    ? []
    : ["만든 부스도 함께 닫혀요. 소속 요원과 업체 계약이 모두 끝나요."]),
  ...(role === "MERCHANT_ADMIN"
    ? ["등록한 업체가 있으면 함께 닫혀서 고객이 도착 알림을 보낼 수 없어요."]
    : []),
  "지난 발렛 처리 기록은 문의 · 분쟁 대응을 위해 5년 동안 보관돼요.",
];

export default function WithdrawSheet({
  open,
  menu,
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
              {getWithdrawNotices(menu).map((notice) => (
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
