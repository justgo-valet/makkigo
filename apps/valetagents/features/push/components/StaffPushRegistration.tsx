"use client";

import { Button } from "@makkigo/ui";
import Image from "next/image";
import { useState } from "react";

import { askAppForPushToken, openAppNotificationSettings } from "@/features/auth/appBridge";
import { useAppPushRegistration } from "@/features/push/hooks/useAppPushRegistration";

interface StaffPushRegistrationProps {
  staffId: number;
  requestPermission: boolean;
}

export default function StaffPushRegistration({
  staffId,
  requestPermission,
}: Readonly<StaffPushRegistrationProps>) {
  const availability = useAppPushRegistration(staffId, requestPermission);
  const [dismissed, setDismissed] = useState(false);
  if (availability === "ready" || dismissed) return null;
  const denied = availability === "denied";

  return (
    // 화면 위에 띄워 페이지 높이를 늘리지 않는다 (늘리면 아래 고정 버튼이 내비게이션 바 뒤로 밀린다).
    // 헤더 버튼을 가리므로 닫을 수 있게 둔다.
    <output className="fixed inset-x-4 top-[calc(0.75rem+var(--safe-area-inset-top))] z-50 mx-auto flex max-w-[735px] items-center gap-3 rounded-xl border bg-white py-3 pr-2 pl-4 shadow-md">
      <Image src="/icons/bell_off.svg" alt="" aria-hidden="true" width={24} height={24} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 break-keep">
        <p className="text-sm font-bold text-(--base-color)">
          {denied ? "기기 알림이 꺼져 있어요" : "알림 연결을 완료하지 못했어요"}
        </p>
        <p className="text-xs text-(--tertiary-color)">
          {denied
            ? "업무 알림 설정과 별개로 휴대폰 설정에서도 알림을 켜 주세요"
            : "잠시 후 다시 시도해 주세요"}
        </p>
      </div>
      <Button
        size="sm"
        className="shrink-0"
        onClick={denied ? openAppNotificationSettings : askAppForPushToken}
      >
        {denied ? "설정 열기" : "다시 시도"}
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-(--tertiary-color)"
        aria-label="닫기"
        onClick={() => setDismissed(true)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </Button>
    </output>
  );
}
