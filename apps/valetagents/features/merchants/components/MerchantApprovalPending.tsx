"use client";

import { Button } from "@makkigo/ui";
import { makkigoLogo } from "@makkigo/ui/assets";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function MerchantApprovalPending() {
  const router = useRouter();

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col px-2 pt-2 pb-[calc(17px+env(safe-area-inset-bottom))]">
      <div className="fixed inset-0 -z-10 bg-[#f7f9fc]" />

      <header className="relative flex h-6 items-center justify-center">
        <Image src={makkigoLogo} alt="마끼고" width={95} height={39} priority />
      </header>

      <section className="flex flex-1 flex-col items-center justify-center px-4 text-center" aria-live="polite">
        <div className="grid size-16 place-items-center rounded-full bg-[rgba(129,169,218,0.2)] text-[#6676de]">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-8">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <p className="mt-6 text-sm font-medium text-[#6676de]">업체 등록 요청 완료</p>
        <h1 className="mt-2 text-2xl leading-8 font-medium text-(--base-color)">
          승인을 기다리고 있어요
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#717171]">
          부스 관리자가 업체 등록 요청을 승인하면 업체 관리 기능을 이용할 수 있어요.
        </p>
        <Button
          type="button"
          className="mt-8 h-14 w-full rounded-[6px] text-lg font-medium"
          onClick={() => router.refresh()}
        >
          승인 여부 확인하기
        </Button>
      </section>
    </main>
  );
}
