import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@makkigo/ui/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@makkigo/ui/components/ui/table";
import Link from "next/link";
import { notFound } from "next/navigation";

import BoothMerchantActions from "@/features/booths/BoothMerchantActions";
import RequestMerchantButton from "@/features/booths/RequestMerchantButton";
import { formatDateTime } from "@/features/common/formatters";
import PageHeader from "@/features/common/PageHeader";
import StatusBadge from "@/features/common/StatusBadge";
import { BOOTH_AGENT_STATUS, BOOTH_MERCHANT_STATUS } from "@/features/common/statusLabels";
import { requireAdminPage } from "@/server/auth/adminSession";
import { readBooth } from "@/server/booth/booths";
import { parseId } from "@/server/common/parseId";

export default async function BoothPage({ params }: Readonly<{ params: Promise<{ boothId: string }> }>) {
  const { boothId: rawBoothId } = await params;
  await requireAdminPage(`/booths/${encodeURIComponent(rawBoothId)}`);
  const boothId = parseId(rawBoothId);
  const booth = boothId ? await readBooth(boothId) : null;
  if (!booth) notFound();

  return (
    <>
      <PageHeader
        title={booth.name}
        description={[booth.address, booth.addressDetail].filter(Boolean).join(" ")}
      />
      <p className="mb-6 text-sm text-(--tertiary-color)">
        만든 사람 {booth.creator.name ?? "-"} {booth.creator.phone ? `(${booth.creator.phone})` : ""} · {formatDateTime(booth.createdAt)}
      </p>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>연결 업체</CardTitle>
            <CardAction>
              <RequestMerchantButton boothId={booth.id} />
            </CardAction>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>업체</TableHead>
                  <TableHead>주소</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>바뀐 때</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {booth.merchants.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-(--tertiary-color)">
                      연결된 업체가 없어요.
                    </TableCell>
                  </TableRow>
                )}
                {booth.merchants.map(({ merchant, status, updatedAt }) => (
                  <TableRow key={merchant.id}>
                    <TableCell>
                      <Link href={`/merchants/${merchant.id}`} className="font-medium text-primary hover:underline">
                        {merchant.name}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-72 truncate">{merchant.address}</TableCell>
                    <TableCell>
                      <StatusBadge {...BOOTH_MERCHANT_STATUS[status]} />
                    </TableCell>
                    <TableCell>{formatDateTime(updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <BoothMerchantActions
                        boothId={booth.id}
                        merchantId={merchant.id}
                        merchantName={merchant.name}
                        status={status}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>요원</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>휴대폰</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>신청한 때</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {booth.agents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-(--tertiary-color)">
                      요원이 없어요.
                    </TableCell>
                  </TableRow>
                )}
                {booth.agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      {agent.staff.name ?? "-"}
                      {agent.staff.id === booth.creator.id && (
                        <span className="ml-2 text-xs text-(--tertiary-color)">부스 관리자</span>
                      )}
                    </TableCell>
                    <TableCell>{agent.staff.phone ?? "-"}</TableCell>
                    <TableCell>
                      <StatusBadge {...BOOTH_AGENT_STATUS[agent.status]} />
                    </TableCell>
                    <TableCell>{formatDateTime(agent.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
