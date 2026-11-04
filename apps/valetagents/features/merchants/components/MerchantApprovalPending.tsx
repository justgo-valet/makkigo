"use client";

import { Badge, Button } from "@makkigo/ui";
import { makkigoLogo } from "@makkigo/ui/assets";
import Image from "next/image";
import { useRouter } from "next/navigation";

import MerchantBoothRequest from "./MerchantBoothRequest";

import type { MerchantContractStatus, OwnedMerchant } from "@/libs/merchant/contracts/merchants";

type PendingMerchant = Pick<OwnedMerchant, "id" | "name" | "booths">;

interface MerchantApprovalPendingProps {
  staffId: number;
  merchants: PendingMerchant[];
}

const STATUS_LABELS: Record<MerchantContractStatus, string> = {
  APPROVED: "등록",
  PENDING: "대기",
  REJECTED: "거절",
};

const STATUS_TONES = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "danger",
} as const;

export default function MerchantApprovalPending({
  staffId,
  merchants,
}: Readonly<MerchantApprovalPendingProps>) {
  const router = useRouter();

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col">
      <header className="flex h-12 w-full shrink-0 items-center justify-center">
        <Image src={makkigoLogo} alt="마끼고" width={95} height={39} priority />
      </header>

      <h1 className="mt-6 text-xl font-bold text-(--base-color)">승인을 기다리고 있어요</h1>
      <p className="mt-1 text-sm break-keep text-(--tertiary-color)">
        부스 관리자가 승인하면 업체 관리 기능을 쓸 수 있어요
      </p>

      <div className="flex flex-1 flex-col gap-8 pt-6 pb-4">
        {merchants.map((merchant) => (
          <section key={merchant.id} aria-label={merchant.name}>
            {merchants.length > 1 && (
              <h2 className="mb-2 text-base font-bold text-(--base-color)">{merchant.name}</h2>
            )}
            {merchant.booths.length === 0 ? (
              <p className="rounded-xl border bg-white px-4 py-5 text-center text-sm break-keep text-(--tertiary-color)">
                계약을 기다리는 부스가 없어요. 다른 부스에 계약을 요청해 주세요.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {merchant.booths.map((booth) => (
                  <li key={booth.id} className="rounded-xl border bg-white p-4 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-(--base-color)">
                          {booth.name}
                        </h3>
                        <p className="mt-0.5 truncate text-xs text-(--tertiary-color)">
                          {booth.address}
                        </p>
                      </div>
                      <Badge tone={STATUS_TONES[booth.status]} className="shrink-0 px-2 py-0.5 text-xs">
                        {STATUS_LABELS[booth.status]}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <MerchantBoothRequest staffId={staffId} merchantId={merchant.id} />
          </section>
        ))}
      </div>

      <Button type="button" size="xl" className="w-full" onClick={() => router.refresh()}>
        승인 여부 확인하기
      </Button>
    </main>
  );
}
