"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@makkigo/ui/components/ui/select";
import Image from "next/image";
import { useState } from "react";

import AppHeader from "@/components/layouts/AppHeader";
import { LABEL_CLASS } from "@/components/fieldStyles";

import type { MenuAccess } from "@/libs/auth/menuItems";

interface MerchantQrCode {
  id: number;
  name: string;
  image: string;
}

const GUEST_STEPS = ["휴대폰 카메라로 QR 을 찍어요", "차량 번호를 입력해요", "주차 현황 · 티켓을 보고 출차를 요청해요"];

export default function MerchantQrCodes({
  menu,
  qrCodes,
  initialMerchantId,
}: Readonly<{ menu: MenuAccess; qrCodes: MerchantQrCode[]; initialMerchantId: number | null }>) {
  const [merchantId, setMerchantId] = useState(
    String(qrCodes.find(({ id }) => id === initialMerchantId)?.id ?? qrCodes[0]?.id ?? ""),
  );
  const selected = qrCodes.find(({ id }) => String(id) === merchantId);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col pb-6">
      <AppHeader menu={menu} backHref="/" />

      <h1 className="mt-4 text-xl font-bold text-(--base-color)">업체 QR</h1>
      <p className="mt-1 text-sm break-keep text-(--tertiary-color)">도착 알림 없이 맡긴 차라면 고객에게 보여 주세요.</p>

      {selected ? (
        <>
          <label htmlFor="merchant-qr-merchant" className={`${LABEL_CLASS} mt-6`}>
            업체
          </label>
          <Select value={merchantId} onValueChange={setMerchantId}>
            <SelectTrigger id="merchant-qr-merchant" className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {qrCodes.map(({ id, name }) => (
                <SelectItem key={id} value={String(id)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <section
            aria-label={`${selected.name} 고객용 QR`}
            className="mt-4 flex flex-col items-center rounded-3xl bg-white px-6 pt-6 pb-5 shadow-[0_2px_12px_rgba(3,9,15,0.08)]"
          >
            <p className="text-center text-xl font-bold break-keep text-(--base-color)">{selected.name}</p>
            <div className="mt-4 rounded-2xl border border-black/5 p-3">
              <Image
                src={selected.image}
                alt={`${selected.name} 고객용 QR 코드`}
                width={240}
                height={240}
                unoptimized
                className="size-60"
              />
            </div>
            <ol className="mt-5 flex w-full flex-col gap-2">
              {GUEST_STEPS.map((step, index) => (
                <li key={step} className="flex items-center gap-3 text-sm break-keep text-(--base-color)">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : (
        <p className="mt-10 text-center text-sm text-(--tertiary-color)">계약된 업체가 없어요.</p>
      )}
    </div>
  );
}
