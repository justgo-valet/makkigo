import { getClientIp, takeLoginAttempt } from "@makkigo/auth";
import { Button, Input } from "@makkigo/ui";
import { headers } from "next/headers";
import Link from "next/link";

import { searchMerchants } from "@/server/merchantAccountRequest/merchantAccountRequests";

const MIN_QUERY_LENGTH = 2;

const readQuery = (value: string | string[] | undefined) => (typeof value === "string" ? value.trim().slice(0, 50) : "");

const search = async (query: string) => {
  if (query.length < MIN_QUERY_LENGTH) return null;
  if (!takeLoginAttempt(`merchant-search:${getClientIp(await headers())}`)) return "LIMITED" as const;
  return searchMerchants(query);
};

export default async function FindMerchantPage({ searchParams }: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const query = readQuery((await searchParams).q);
  const result = await search(query);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 p-6 py-12">
      <div>
        <Link href="/login" className="text-sm text-(--tertiary-color) hover:underline">
          ← 로그인으로
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">내 업체 찾기</h1>
        <p className="mt-2 text-sm leading-relaxed break-keep text-(--tertiary-color)">
          업체 이름이나 주소로 찾아 보세요. 업체를 고르고 계정을 요청하면 운영팀이 확인한 뒤 아이디와 임시 비밀번호를 알려
          드려요.
        </p>
      </div>
      <form className="flex gap-2">
        <Input
          name="q"
          defaultValue={query}
          placeholder="예: 마끼고 식당, 테헤란로 152"
          minLength={MIN_QUERY_LENGTH}
          maxLength={50}
          required
          aria-label="업체 이름 또는 주소"
        />
        <Button type="submit">찾기</Button>
      </form>
      {result === "LIMITED" && (
        <p className="text-sm text-destructive">검색이 너무 많아요. 잠시 후 다시 시도해 주세요.</p>
      )}
      {Array.isArray(result) && (
        <ul className="flex flex-col gap-2">
          {result.length === 0 && (
            <li className="rounded-2xl border border-dashed border-black/10 bg-white p-8 text-center text-sm text-(--tertiary-color)">
              찾는 업체가 없어요.
            </li>
          )}
          {result.map((merchant) => (
            <li key={merchant.id} className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4">
              <div className="min-w-0">
                <p className="font-medium">{merchant.name}</p>
                <p className="mt-1 text-sm break-keep text-(--tertiary-color)">
                  {merchant.category ? `${merchant.category} · ` : ""}
                  {merchant.address}
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/find-merchant/request?merchant=${merchant.id}`}>계정 요청</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
      {result !== null && (
        <p className="text-center text-sm text-(--tertiary-color)">
          찾는 업체가 없나요?{" "}
          <Link href="/find-merchant/request" className="font-medium text-primary hover:underline">
            업체 등록 요청하기
          </Link>
        </p>
      )}
    </main>
  );
}
