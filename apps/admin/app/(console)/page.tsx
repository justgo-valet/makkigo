import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@makkigo/ui/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@makkigo/ui/components/ui/table";
import Link from "next/link";

import { formatDateTime } from "@/features/common/formatters";
import PageHeader from "@/features/common/PageHeader";
import StatusBadge from "@/features/common/StatusBadge";
import { VALET_SESSION_STATUS } from "@/features/common/statusLabels";
import { requireAdminPage } from "@/server/auth/adminSession";
import { readDashboard } from "@/server/dashboard/readDashboard";

export default async function DashboardPage() {
  await requireAdminPage("/");
  const { counts, recentSessions } = await readDashboard();
  const stats = [
    { label: "업체", value: counts.merchants, href: "/merchants" },
    { label: "업체 관리자 (사용 중)", value: counts.merchantAdmins, href: "/merchant-admins" },
    { label: "부스", value: counts.booths, href: "/booths" },
    { label: "승인된 요원", value: counts.approvedAgents, href: "/booths" },
    { label: "고객", value: counts.users },
    { label: "오늘 발렛 세션", value: counts.todaySessions, href: "/valet-sessions" },
    { label: "진행 중 세션", value: counts.activeSessions, href: "/valet-sessions" },
    { label: "부스 연결 대기", value: counts.pendingRequests, href: "/booths" },
    { label: "계정 요청 대기", value: counts.pendingAccountRequests, href: "/merchant-account-requests" },
  ];

  return (
    <>
      <PageHeader title="대시보드" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, href }) => {
          const card = (
            <Card className="gap-2 py-5 transition-colors hover:border-primary/40">
              <CardHeader>
                <CardDescription>{label}</CardDescription>
              </CardHeader>
              <CardContent className="text-2xl font-bold tabular-nums">{value.toLocaleString("ko-KR")}</CardContent>
            </Card>
          );
          return href ? (
            <Link key={label} href={href}>
              {card}
            </Link>
          ) : (
            <div key={label}>{card}</div>
          );
        })}
      </div>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>최근 발렛 세션</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <p className="py-6 text-center text-sm text-(--tertiary-color)">아직 발렛 세션이 없어요.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>번호</TableHead>
                  <TableHead>차량 번호</TableHead>
                  <TableHead>업체</TableHead>
                  <TableHead>부스</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>시작</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="tabular-nums">{session.id}</TableCell>
                    <TableCell>{session.plateNumber}</TableCell>
                    <TableCell>{session.merchant?.name ?? "-"}</TableCell>
                    <TableCell>{session.booth?.name ?? "-"}</TableCell>
                    <TableCell>
                      <StatusBadge {...VALET_SESSION_STATUS[session.status]} />
                    </TableCell>
                    <TableCell>{formatDateTime(session.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
