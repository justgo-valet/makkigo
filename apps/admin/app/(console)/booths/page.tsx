import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@makkigo/ui/components/ui/table";
import Link from "next/link";

import { formatDateTime } from "@/features/common/formatters";
import PageHeader from "@/features/common/PageHeader";
import Pagination from "@/features/common/Pagination";
import SearchForm from "@/features/common/SearchForm";
import { requireAdminPage } from "@/server/auth/adminSession";
import { listBooths } from "@/server/booth/booths";
import { pageCount, parsePage } from "@/server/common/pagination";

const toHref = (query: string, page = 1) => {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/booths?${search}` : "/booths";
};

export default async function BoothsPage({ searchParams }: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const page = parsePage(params.page);
  await requireAdminPage(toHref(query, page));
  const { booths, total } = await listBooths({ query, page });

  return (
    <>
      <PageHeader title="부스" description={`${total.toLocaleString("ko-KR")}곳`} />
      <SearchForm query={query} placeholder="부스 이름으로 검색" />
      <div className="rounded-xl border bg-white px-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>주소</TableHead>
              <TableHead>만든 사람</TableHead>
              <TableHead className="text-right">승인된 요원</TableHead>
              <TableHead className="text-right">연결된 업체</TableHead>
              <TableHead className="text-right">연결 대기</TableHead>
              <TableHead>만든 날</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {booths.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-(--tertiary-color)">
                  부스가 없어요.
                </TableCell>
              </TableRow>
            )}
            {booths.map((booth) => (
              <TableRow key={booth.id}>
                <TableCell>
                  <Link href={`/booths/${booth.id}`} className="font-medium text-primary hover:underline">
                    {booth.name}
                  </Link>
                </TableCell>
                <TableCell className="max-w-72 truncate">{booth.address}</TableCell>
                <TableCell>{booth.creator.name ?? "-"}</TableCell>
                <TableCell className="text-right tabular-nums">{booth._count.agents}</TableCell>
                <TableCell className="text-right tabular-nums">{booth.approvedMerchants}</TableCell>
                <TableCell className="text-right tabular-nums">{booth.pendingMerchants}</TableCell>
                <TableCell>{formatDateTime(booth.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} pageCount={pageCount(total)} href={(target) => toHref(query, target)} />
    </>
  );
}
