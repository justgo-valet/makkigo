"use client";

import { useHiddenHeader } from "@/features/auth/hooks/useHiddenHeader";
import GuestScreen from "@/features/guest/components/GuestScreen";

export default function GuestUnavailable() {
  useHiddenHeader();

  return (
    <GuestScreen>
      <h1 className="mt-5 text-lg font-bold text-(--base-color)">사용할 수 없는 QR 이에요</h1>
      <p className="mt-3 text-sm break-keep text-(--tertiary-color)">
        업체에 붙은 QR 을 다시 찍거나, 요원님께 차량 번호를 말씀해 주세요.
      </p>
    </GuestScreen>
  );
}
