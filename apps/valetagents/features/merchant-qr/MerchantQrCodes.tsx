import Image from "next/image";
import Link from "next/link";

import AppHeader from "@/components/layouts/AppHeader";

import type { MenuAccess } from "@/libs/auth/menuItems";

interface MerchantQrCode {
  id: number;
  name: string;
  image: string;
}

export default function MerchantQrCodes({
  menu,
  qrCodes,
  allHref,
}: Readonly<{ menu: MenuAccess; qrCodes: MerchantQrCode[]; allHref: string | null }>) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col pb-6">
      <AppHeader menu={menu} backHref="/" />

      <h1 className="mt-4 text-xl font-bold text-(--base-color)">업체 QR</h1>
      <p className="mt-1 text-sm break-keep text-(--tertiary-color)">
        도착 알림 없이 맡긴 차라면 고객에게 보여 주세요. QR 을 찍고 차량 번호를 입력하면 주차 현황과 티켓을 보고 출차를
        요청할 수 있어요.
      </p>

      {qrCodes.length === 0 ? (
        <p className="mt-8 text-center text-sm text-(--tertiary-color)">계약된 업체가 없어요.</p>
      ) : (
        <ul className="mt-5 flex flex-col gap-4">
          {qrCodes.map(({ id, name, image }) => (
            <li key={id} className="flex flex-col items-center rounded-2xl bg-white p-5 shadow-xs">
              <p className="text-lg font-bold text-(--base-color)">{name}</p>
              <Image
                src={image}
                alt={`${name} 고객용 QR 코드`}
                width={256}
                height={256}
                unoptimized
                className="mt-3 size-64"
              />
            </li>
          ))}
        </ul>
      )}

      {allHref && (
        <Link href={allHref} className="mt-5 self-center text-sm text-(--tertiary-color) underline">
          모든 업체 QR 보기
        </Link>
      )}
    </div>
  );
}
