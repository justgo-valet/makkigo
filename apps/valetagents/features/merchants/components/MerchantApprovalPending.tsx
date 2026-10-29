"use client";

import { Button } from "@makkigo/ui";
import { makkigoLogo } from "@makkigo/ui/assets";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function MerchantApprovalPending() {
  const router = useRouter();

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col">
      <header className="flex h-12 w-full shrink-0 items-center justify-center">
        <Image src={makkigoLogo} alt="마끼고" width={95} height={39} priority />
      </header>

      <section className="flex flex-1 flex-col items-center justify-center px-4 text-center" aria-live="polite">
        <div className="grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-8">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <p className="mt-6 text-sm font-medium text-primary">업체 등록 요청 완료</p>
        <h1 className="mt-2 text-xl font-bold text-(--base-color)">
          승인을 기다리고 있어요
        </h1>
        <p className="mt-3 text-sm leading-6 text-(--tertiary-color)">
          부스 관리자가 업체 등록 요청을 승인하면 업체 관리 기능을 이용할 수 있어요.
        </p>
        <Button
          type="button"
          size="xl"
          className="mt-8 w-full"
          onClick={() => router.refresh()}
        >
          승인 여부 확인하기
        </Button>
      </section>
    </main>
  );
}
