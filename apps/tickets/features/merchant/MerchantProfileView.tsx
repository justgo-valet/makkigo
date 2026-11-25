"use client";

import { Badge, Button } from "@makkigo/ui";
import Image from "next/image";

import { useIsInApp } from "@/libs/common/useIsInApp";

import type { MerchantProfile } from "@/server/merchant/getMerchantProfile";

const BOOTH_STATUS = {
  APPROVED: { label: "연결됨", tone: "success" },
  PENDING: { label: "승인 대기", tone: "warning" },
  REJECTED: { label: "거절됨", tone: "danger" },
} as const;

export default function MerchantProfileView({ profile }: Readonly<{ profile: MerchantProfile }>) {
  const address = [profile.address, profile.addressDetail].filter(Boolean).join(" ");
  const inApp = useIsInApp();

  return (
    <main className="mx-auto max-w-6xl px-4 pt-8 pb-[calc(2.5rem+var(--safe-area-inset-bottom))] sm:px-6 sm:pt-10">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold tracking-tight">업체 정보</h1>
        <p className="mt-1 text-sm text-(--tertiary-color)">업체 정보를 바꾸려면 마끼고 운영팀에 문의해 주세요.</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6 print:hidden">
          <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5 sm:p-6">
            <h2 className="text-lg font-bold">{profile.name}</h2>
            <dl className="mt-4 grid grid-cols-[72px_1fr] gap-y-3 sm:grid-cols-[88px_1fr] text-sm">
              <dt className="text-(--tertiary-color)">주소</dt>
              <dd>
                {address}
                {profile.postalCode && <span className="ml-1 text-(--tertiary-color)">({profile.postalCode})</span>}
              </dd>
              <dt className="text-(--tertiary-color)">전화번호</dt>
              <dd>{profile.phone ?? "-"}</dd>
            </dl>
          </section>

          <section className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
            <h2 className="font-bold">사진</h2>
            {profile.photoUrls.length === 0 ? (
              <p className="mt-3 text-sm text-(--tertiary-color)">등록된 사진이 없어요.</p>
            ) : (
              <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
                {profile.photoUrls.map((url, index) => (
                  <li key={url} className="relative aspect-square overflow-hidden rounded-xl bg-black/5">
                    <Image src={url} alt={`${profile.name} 사진 ${index + 1}`} fill unoptimized className="object-cover" />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
            <h2 className="font-bold">연결된 부스</h2>
            {profile.booths.length === 0 ? (
              <p className="mt-3 text-sm text-(--tertiary-color)">연결된 부스가 없어요.</p>
            ) : (
              <ul className="mt-2 divide-y divide-black/5">
                {profile.booths.map((booth) => (
                  <li key={booth.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{booth.name}</p>
                      <p className="truncate text-xs text-(--tertiary-color)">{booth.address}</p>
                    </div>
                    <Badge tone={BOOTH_STATUS[booth.status].tone}>{BOOTH_STATUS[booth.status].label}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="flex flex-col items-center self-start rounded-2xl bg-white px-6 py-8 text-center ring-1 ring-black/5 print:ring-0">
          <h2 className="font-bold print:hidden">고객용 QR 코드</h2>
          <p className="mt-1 text-xs break-keep text-(--tertiary-color) print:hidden">
            업체에 붙여 두면 고객이 QR 을 찍고 차량 번호를 넣어 티켓을 보고 출차를 요청할 수 있어요.
          </p>
          <p className="mt-5 text-lg font-bold">{profile.name}</p>
          {profile.qr.usable ? (
            <>
              <Image
                src={profile.qr.image}
                alt={`${profile.name} 발렛 QR 코드`}
                width={224}
                height={224}
                unoptimized
                className="mt-4 size-56"
              />
              <p className="mt-3 text-base font-bold">QR 을 찍고 차량 번호를 입력하면</p>
              <p className="text-base font-bold">출차를 요청할 수 있어요</p>
              {inApp ? (
                <p className="mt-6 text-xs break-keep text-(--tertiary-color)">
                  QR 저장 · 인쇄는 컴퓨터 브라우저로 tickets.makkigo.com 에 로그인해 주세요.
                </p>
              ) : (
                <div className="mt-6 flex w-full gap-2 print:hidden">
                  <Button asChild variant="outline" size="lg" className="flex-1">
                    <a href={profile.qr.image} download={`${profile.name}-발렛-QR.png`}>
                      PNG 저장
                    </a>
                  </Button>
                  <Button type="button" size="lg" className="flex-1" onClick={() => window.print()}>
                    인쇄하기
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-(--tertiary-color)">부스 연결이 승인되면 QR 을 쓸 수 있어요.</p>
          )}
        </section>
      </div>
    </main>
  );
}
