import { Button } from "@makkigo/ui";
import Image from "next/image";

interface PushPermissionBannerProps {
  onOpenSettings: () => void;
}

export default function PushPermissionBanner({
  onOpenSettings,
}: Readonly<PushPermissionBannerProps>) {
  return (
    <output className="flex items-center gap-3 rounded-xl border bg-(--surface-color) px-4 py-3">
      <Image src="/icons/alarm.svg" alt="" aria-hidden="true" width={24} height={24} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 break-keep">
        <p className="text-sm font-bold text-(--base-color)">알림이 꺼져 있어요</p>
        <p className="text-xs text-(--tertiary-color)">
          주차 · 출차 안내를 앱으로 받으려면 켜 주세요
        </p>
      </div>
      <Button size="sm" className="shrink-0" onClick={onOpenSettings}>
        설정 열기
      </Button>
    </output>
  );
}
