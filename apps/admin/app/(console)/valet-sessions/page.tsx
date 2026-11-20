import { cn } from "@makkigo/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@makkigo/ui/components/ui/table";
import Link from "next/link";

import { formatDateTime, formatWon } from "@/features/common/formatters";
import PageHeader from "@/features/common/PageHeader";
import Pagination from "@/features/common/Pagination";
import StatusBadge from "@/features/common/StatusBadge";
import { VALET_SESSION_STATUS } from "@/features/common/statusLabels";
import { requireAdminPage } from "@/server/auth/adminSession";
import { pageCount, parsePage } from "@/server/common/pagination";
import { listValetSessions } from "@/server/valetSession/valetSessions";

import type { ValetSessionStatus } from "database";

const STATUSES = Object.keys(VALET_SESSION_STATUS) as ValetSessionStatus[];

const parseStatus = (value: string | string[] | undefined) =>
  STATUSES.find((status) => status === value) ?? null;

const toHref = (status: ValetSessionStatus | null, page = 1) => {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/valet-sessions?${query}` : "/valet-sessions";
};

export default async function ValetSessionsPage({ searchParams }: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const page = parsePage(params.page);
  await requireAdminPage(toHref(status, page));
  const { sessions, total } = await listValetSessions({ status, page });

  return (
    <>
      <PageHeader title="발렛 세션" description={`${total.toLocaleString("ko-KR")}건`} />
      <div className="mb-4 flex flex-wrap gap-2">
        {[null, ...STATUSES].map((value) => (
          <Link
            key={value ?? "ALL"}
            href={toHref(value)}
            aria-current={value === status ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              value === status ? "border-primary bg-primary text-white" : "bg-white hover:border-primary/40",
            )}
          >
            {value ? VALET_SESSION_STATUS[value].label : "전체"}
          </Link>
        ))}
      </div>
      <div className="rounded-xl border bg-white px-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>번호</TableHead>
              <TableHead>차량 번호</TableHead>
              <TableHead>업체</TableHead>
              <TableHead>부스</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>시작</TableHead>
              <TableHead>주차</TableHead>
              <TableHead>출차 요청</TableHead>
              <TableHead>종료</TableHead>
              <TableHead className="text-right">요금</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-(--tertiary-color)">
                  발렛 세션이 없어요.
                </TableCell>
              </TableRow>
            )}
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="tabular-nums">{session.id}</TableCell>
                <TableCell>{session.plateNumber}</TableCell>
                <TableCell>
                  {session.merchant ? <Link href={`/merchants/${session.merchant.id}`} className="hover:underline">{session.merchant.name}</Link> : "-"}
                </TableCell>
                <TableCell>
                  {session.booth ? <Link href={`/booths/${session.booth.id}`} className="hover:underline">{session.booth.name}</Link> : "-"}
                </TableCell>
                <TableCell>
                  <StatusBadge {...VALET_SESSION_STATUS[session.status]} />
                </TableCell>
                <TableCell>{formatDateTime(session.createdAt)}</TableCell>
                <TableCell>{formatDateTime(session.parkedAt)}</TableCell>
                <TableCell>{formatDateTime(session.pickupRequestedAt)}</TableCell>
                <TableCell>{formatDateTime(session.completedAt ?? session.cancelledAt)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatWon(session.actualFee ?? session.baseFee)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} pageCount={pageCount(total)} href={(target) => toHref(status, target)} />
    </>
  );
}
