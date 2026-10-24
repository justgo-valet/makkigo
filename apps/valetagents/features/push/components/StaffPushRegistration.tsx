"use client";

import { Button } from "@makkigo/ui";
import Image from "next/image";

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
  if (availability === "ready") return null;
  const denied = availability === "denied";

  return (
    <output className="mt-3 flex items-center gap-3 rounded-xl border bg-(--surface-color) px-4 py-3">
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
    </output>
  );
}
