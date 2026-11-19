import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@makkigo/ui/components/ui/table";
import Link from "next/link";

import { formatDateTime } from "@/features/common/formatters";
import PageHeader from "@/features/common/PageHeader";
import Pagination from "@/features/common/Pagination";
import StatusBadge from "@/features/common/StatusBadge";
import CreateMerchantAdminButton from "@/features/merchantAdmins/CreateMerchantAdminButton";
import { merchantAdminStatus } from "@/features/merchantAdmins/merchantAdminStatus";
import { requireAdminPage } from "@/server/auth/adminSession";
import { pageCount, parsePage } from "@/server/common/pagination";
import { listMerchantAdmins } from "@/server/merchantAdmin/merchantAdmins";

const toHref = (page: number) => (page > 1 ? `/merchant-admins?page=${page}` : "/merchant-admins");

export default async function MerchantAdminsPage({ searchParams }: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const page = parsePage((await searchParams).page);
  await requireAdminPage(toHref(page));
  const { merchantAdmins, total } = await listMerchantAdmins(page);
  const now = new Date();

  return (
    <>
      <PageHeader
        title="업체 관리자"
        description={`${total.toLocaleString("ko-KR")}명 · 티켓 관리 웹에 아이디 · 비밀번호로 로그인합니다.`}
        action={<CreateMerchantAdminButton />}
      />
      <div className="rounded-xl border bg-white px-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>아이디</TableHead>
              <TableHead>이름</TableHead>
              <TableHead>업체</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>만든 날</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merchantAdmins.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-(--tertiary-color)">
                  업체 관리자가 없어요.
                </TableCell>
              </TableRow>
            )}
            {merchantAdmins.map((merchantAdmin) => (
              <TableRow key={merchantAdmin.id}>
                <TableCell>
                  <Link href={`/merchant-admins/${merchantAdmin.id}`} className="font-medium text-primary hover:underline">
                    {merchantAdmin.loginId}
                  </Link>
                </TableCell>
                <TableCell>{merchantAdmin.name}</TableCell>
                <TableCell>
                  {merchantAdmin.merchant
                    ? `${merchantAdmin.merchant.name}${merchantAdmin.merchant.deletedAt ? " (삭제됨)" : ""}`
                    : "연결 안 됨"}
                </TableCell>
                <TableCell>
                  <StatusBadge {...merchantAdminStatus(merchantAdmin, now)} />
                </TableCell>
                <TableCell>{formatDateTime(merchantAdmin.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} pageCount={pageCount(total)} href={toHref} />
    </>
  );
}
