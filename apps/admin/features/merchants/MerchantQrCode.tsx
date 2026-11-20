import { buttonVariants } from "@makkigo/ui";
import { Download } from "lucide-react";
import Image from "next/image";

export default function MerchantQrCode({
  merchantId,
  merchantName,
  qrCode,
  usable,
}: Readonly<{ merchantId: number; merchantName: string; qrCode: { url: string; image: string }; usable: boolean }>) {
  return (
    <div className="flex items-start gap-6">
      <Image
        src={qrCode.image}
        alt={`${merchantName} 고객용 QR`}
        width={160}
        height={160}
        unoptimized
        className={usable ? "rounded-md border" : "rounded-md border opacity-40"}
      />
      <div className="flex min-w-0 flex-col gap-3">
        <p className={usable ? "text-sm font-medium text-emerald-700" : "text-sm font-medium text-amber-700"}>
          {usable ? "사용할 수 있는 QR 이에요." : "승인된 부스 연결이 없어 고객이 이 QR 을 쓸 수 없어요."}
        </p>
        <p className="break-all text-xs text-(--tertiary-color)">{qrCode.url}</p>
        <a
          href={qrCode.image}
          download={`makkigo-merchant-${merchantId}-qr.png`}
          className={buttonVariants({ variant: "outline", size: "sm", className: "self-start" })}
        >
          <Download aria-hidden />
          PNG 내려받기
        </a>
      </div>
    </div>
  );
}
