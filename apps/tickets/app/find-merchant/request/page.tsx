import Link from "next/link";

import AccountRequestForm from "@/features/merchantAccountRequest/AccountRequestForm";
import { readRequestableMerchant } from "@/server/merchantAccountRequest/merchantAccountRequests";

const parseMerchantId = (value: string | string[] | undefined) => {
  const id = typeof value === "string" && /^\d{1,9}$/.test(value) ? Number(value) : 0;
  return id > 0 ? id : null;
};

export default async function MerchantAccountRequestPage({ searchParams }: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const merchantId = parseMerchantId((await searchParams).merchant);
  const merchant = merchantId === null ? null : await readRequestableMerchant(merchantId);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 p-6 py-12">
      <div>
        <Link href="/find-merchant" className="text-sm text-(--tertiary-color) hover:underline">
          ← 업체 찾기로
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">{merchant ? "계정 요청" : "업체 등록 요청"}</h1>
        <p className="mt-2 text-sm leading-relaxed break-keep text-(--tertiary-color)">
          운영팀이 업체와 요청한 분을 확인한 뒤 남겨 주신 연락처로 아이디와 임시 비밀번호를 알려 드려요.
        </p>
      </div>
      <AccountRequestForm merchant={merchant} />
    </main>
  );
}
