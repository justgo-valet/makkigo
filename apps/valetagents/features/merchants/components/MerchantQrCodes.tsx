"use client";

import { Button } from "@makkigo/ui";
import Image from "next/image";

import AppHeader from "@/components/layouts/AppHeader";

import type { MenuAccess } from "@/libs/auth/menuItems";
import type { MerchantQrCode } from "@/server/merchant/listMerchantQrCodes";

interface MerchantQrCodesProps {
  menu: MenuAccess;
  qrCodes: MerchantQrCode[];
}

export default function MerchantQrCodes({ menu, qrCodes }: Readonly<MerchantQrCodesProps>) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col pb-6">
      <div className="print:hidden">
        <AppHeader menu={menu} backHref="/" />
        <h1 className="mt-4 text-xl font-bold text-(--base-color)">QR 코드</h1>
        <p className="mt-1 text-sm break-keep text-(--tertiary-color)">
          업체에 붙여 두면 고객이 QR 을 찍고 차량 번호를 넣어 티켓을 보고 출차를 요청할 수 있어요.
        </p>
      </div>

      {qrCodes.length === 0 && (
        <p className="mt-8 text-center text-sm text-(--tertiary-color)">등록한 업체가 없어요.</p>
      )}

      <ul className="mt-4 flex flex-col gap-4">
        {qrCodes.map((qr) => (
          <li
            key={qr.id}
            className="flex break-inside-avoid flex-col items-center rounded-2xl bg-white px-5 py-6 text-center text-(--base-color)"
          >
            <p className="text-lg font-bold">{qr.name}</p>
            {qr.usable ? (
              <>
                <Image
                  src={qr.image}
                  alt={`${qr.name} 발렛 QR 코드`}
                  width={224}
                  height={224}
                  unoptimized
                  className="mt-4 size-56"
                />
                <p className="mt-3 text-base font-bold">QR 을 찍고 차량 번호를 입력하면</p>
                <p className="text-base font-bold">출차를 요청할 수 있어요</p>
                <Button asChild variant="outline" size="xl" className="mt-5 w-full print:hidden">
                  <a href={qr.image} download={`${qr.name}-발렛-QR.png`}>
                    이미지 저장
                  </a>
                </Button>
              </>
            ) : (
              <p className="mt-3 text-sm text-(--tertiary-color)">
                부스 계약이 승인되면 QR 을 쓸 수 있어요.
              </p>
            )}
          </li>
        ))}
      </ul>

      {qrCodes.some(({ usable }) => usable) && (
        <div className="mt-6 print:hidden">
          <Button type="button" size="xl" className="w-full" onClick={() => window.print()}>
            인쇄하기
          </Button>
          <p className="mt-3 text-center text-xs break-keep text-(--tertiary-color)">
            앱에서 저장 · 인쇄가 안 되면 컴퓨터 브라우저로 valet.makkigo.com 에 로그인해 주세요.
          </p>
        </div>
      )}
    </div>
  );
}
