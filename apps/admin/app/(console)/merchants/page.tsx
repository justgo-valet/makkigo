import { buttonVariants } from "@makkigo/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@makkigo/ui/components/ui/table";
import { Plus } from "lucide-react";
import Link from "next/link";

import { formatDateTime } from "@/features/common/formatters";
import PageHeader from "@/features/common/PageHeader";
import Pagination from "@/features/common/Pagination";
import SearchForm from "@/features/common/SearchForm";
import { requireAdminPage } from "@/server/auth/adminSession";
import { pageCount, parsePage } from "@/server/common/pagination";
import { listMerchants } from "@/server/merchant/merchants";

const toHref = (query: string, linkedOnly: boolean, page = 1) => {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (linkedOnly) params.set("linked", "1");
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/merchants?${search}` : "/merchants";
};

export default async function MerchantsPage({ searchParams }: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const linkedOnly = params.linked === "1";
  const page = parsePage(params.page);
  await requireAdminPage(toHref(query, linkedOnly, page));
  const { merchants, total } = await listMerchants({ query, page, linkedOnly });

  return (
    <>
      <PageHeader
        title="업체"
        description={`${total.toLocaleString("ko-KR")}곳`}
        action={
          <Link href="/merchants/new" className={buttonVariants()}>
            <Plus aria-hidden />
            업체 추가
          </Link>
        }
      />
      <SearchForm query={query} placeholder="업체 이름으로 검색">
        <label className="flex shrink-0 items-center gap-2 text-sm">
          <input type="checkbox" name="linked" value="1" defaultChecked={linkedOnly} className="size-4 accent-primary" />
          부스 연결된 업체만
        </label>
      </SearchForm>
      <div className="rounded-xl border bg-white px-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>업종</TableHead>
              <TableHead>출처</TableHead>
              <TableHead>주소</TableHead>
              <TableHead>전화번호</TableHead>
              <TableHead className="text-right">연결된 부스</TableHead>
              <TableHead className="text-right">관리자</TableHead>
              <TableHead>등록한 날</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merchants.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-(--tertiary-color)">
                  업체가 없어요.
                </TableCell>
              </TableRow>
            )}
            {merchants.map((merchant) => (
              <TableRow key={merchant.id}>
                <TableCell>
                  <Link href={`/merchants/${merchant.id}`} className="font-medium text-primary hover:underline">
                    {merchant.name}
                  </Link>
                </TableCell>
                <TableCell className="max-w-40 truncate">{merchant.category ?? "-"}</TableCell>
                <TableCell>{merchant.publicDataId ? "공공데이터" : "수동"}</TableCell>
                <TableCell className="max-w-80 truncate">{merchant.address}</TableCell>
                <TableCell>{merchant.phone ?? "-"}</TableCell>
                <TableCell className="text-right tabular-nums">{merchant.booths.length}</TableCell>
                <TableCell className="text-right tabular-nums">{merchant._count.admins}</TableCell>
                <TableCell>{formatDateTime(merchant.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} pageCount={pageCount(total)} href={(target) => toHref(query, linkedOnly, target)} />
    </>
  );
}
