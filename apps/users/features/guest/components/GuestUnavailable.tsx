"use client";

import { makkigoLogo } from "@makkigo/ui/assets";
import Image from "next/image";

import { useHiddenHeader } from "@/features/auth/hooks/useHiddenHeader";

export default function GuestUnavailable() {
  useHiddenHeader();

  return (
    <div className="mx-auto h-full w-full max-w-[375px]">
      <div className="flex min-h-full flex-col rounded-lg bg-white px-6 py-6">
        <Image src={makkigoLogo} alt="마끼고" width={95} height={39} priority />
        <h1 className="mt-5 text-lg font-bold text-(--base-color)">사용할 수 없는 QR 이에요</h1>
        <p className="mt-3 text-sm break-keep text-(--tertiary-color)">
          업체에 붙은 QR 을 다시 찍거나, 요원님께 차량 번호를 말씀해 주세요.
        </p>
      </div>
    </div>
  );
}
