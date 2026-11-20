import { cn } from "@makkigo/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@makkigo/ui/components/ui/table";
import Link from "next/link";

import { formatDateTime, formatPhone } from "@/features/common/formatters";
import PageHeader from "@/features/common/PageHeader";
import Pagination from "@/features/common/Pagination";
import StatusBadge from "@/features/common/StatusBadge";
import { MERCHANT_ACCOUNT_REQUEST_STATUS } from "@/features/common/statusLabels";
import RejectAccountRequestButton from "@/features/merchantAccountRequests/RejectAccountRequestButton";
import CreateMerchantAdminButton from "@/features/merchantAdmins/CreateMerchantAdminButton";
import { requireAdminPage } from "@/server/auth/adminSession";
import { pageCount, parsePage } from "@/server/common/pagination";
import { listMerchantAccountRequests } from "@/server/merchantAccountRequest/merchantAccountRequests";

const toHref = (all: boolean, page = 1) => {
  const params = new URLSearchParams();
  if (all) params.set("status", "all");
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/merchant-account-requests?${query}` : "/merchant-account-requests";
};

export default async function MerchantAccountRequestsPage({ searchParams }: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const params = await searchParams;
  const all = params.status === "all";
  const page = parsePage(params.page);
  await requireAdminPage(toHref(all, page));
  const { requests, total } = await listMerchantAccountRequests(!all, page);

  return (
    <>
      <PageHeader
        title="계정 요청"
        description="티켓 관리 웹의 '내 업체 찾기'로 들어온 요청입니다. 업체와 요청한 분을 확인한 뒤 계정을 발급하고, 아이디와 임시 비밀번호는 연락처로 직접 알려 주세요. 처리한 요청은 30일 뒤 지워집니다."
      />
      <div className="mb-4 flex gap-2">
        {[false, true].map((value) => (
          <Link
            key={String(value)}
            href={toHref(value)}
            aria-current={value === all ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              value === all ? "border-primary bg-primary text-white" : "bg-white hover:border-primary/40",
            )}
          >
            {value ? "전체" : "대기"}
          </Link>
        ))}
      </div>
      <div className="rounded-xl border bg-white px-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>업체</TableHead>
              <TableHead>요청한 분</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>요청</TableHead>
              <TableHead className="text-right">처리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-(--tertiary-color)">
                  {all ? "계정 요청이 없어요." : "대기 중인 계정 요청이 없어요."}
                </TableCell>
              </TableRow>
            )}
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="whitespace-normal">
                  {request.merchant ? (
                    <Link href={`/merchants/${request.merchant.id}`} className="font-medium text-primary hover:underline">
                      {request.merchant.name}
                      {request.merchant.deletedAt ? " (삭제됨)" : ""}
                    </Link>
                  ) : (
                    <span className="font-medium">
                      {request.merchantName} <span className="text-xs text-(--tertiary-color)">(새 업체)</span>
                    </span>
                  )}
                  <p className="text-xs text-(--tertiary-color)">{request.merchant?.address ?? request.merchantAddress}</p>
                </TableCell>
                <TableCell>
                  <p>{request.requesterName}</p>
                  <p className="text-xs text-(--tertiary-color) tabular-nums">{formatPhone(request.requesterPhone)}</p>
                </TableCell>
                <TableCell>
                  <StatusBadge {...MERCHANT_ACCOUNT_REQUEST_STATUS[request.status]} />
                </TableCell>
                <TableCell>{formatDateTime(request.createdAt)}</TableCell>
                <TableCell className="text-right">
                  {request.status === "PENDING" ? (
                    <div className="flex justify-end gap-2">
                      {!request.merchant && (
                        <Link
                          href="/merchants/new"
                          target="_blank"
                          className="inline-flex h-8 items-center rounded-md border px-3 text-sm hover:bg-black/5"
                        >
                          업체 추가
                        </Link>
                      )}
                      <CreateMerchantAdminButton
                        accountRequest={{
                          id: request.id,
                          requesterName: request.requesterName,
                          merchant: request.merchant && !request.merchant.deletedAt ? request.merchant : null,
                        }}
                      />
                      <RejectAccountRequestButton requestId={request.id} />
                    </div>
                  ) : request.merchantAdmin ? (
                    <Link href={`/merchant-admins/${request.merchantAdmin.id}`} className="text-sm text-primary hover:underline">
                      {request.merchantAdmin.loginId}
                    </Link>
                  ) : (
                    <span className="text-sm text-(--tertiary-color)">{formatDateTime(request.processedAt)}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} pageCount={pageCount(total)} href={(next) => toHref(all, next)} />
    </>
  );
}
