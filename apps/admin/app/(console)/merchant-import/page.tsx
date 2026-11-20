import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@makkigo/ui/components/ui/table";

import { formatDateTime } from "@/features/common/formatters";
import PageHeader from "@/features/common/PageHeader";
import AddImportTargetButton from "@/features/merchantImport/AddImportTargetButton";
import RunAllImportsButton from "@/features/merchantImport/RunAllImportsButton";
import ImportRunProvider from "@/features/merchantImport/ImportRunProvider";
import ImportTargetActions from "@/features/merchantImport/ImportTargetActions";
import { requireAdminPage } from "@/server/auth/adminSession";
import { listMerchantImportTargets } from "@/server/merchantImport/merchantImport";
import { hasPublicDataServiceKey } from "@/server/merchantImport/publicDataStores";

import type { MerchantImportResult } from "@/server/merchantImport/merchantImport";

const describeResult = (result: MerchantImportResult | null) => {
  if (!result) return "-";
  if (!result.ok) return `실패 (${formatDateTime(result.at)}) ${result.error}`;
  return [
    `받음 ${result.fetched}`,
    `추가 ${result.inserted}`,
    `이미 있음 ${result.skippedExisting}`,
    `근처 같은 이름 ${result.skippedNearby}`,
    `주소 없음 ${result.skippedInvalid}`,
    `삭제 ${result.deleted}`,
    `되살림 ${result.revived}`,
    `연결돼 남김 ${result.keptLinked}`,
  ].join(" · ");
};

export default async function MerchantImportPage() {
  await requireAdminPage("/merchant-import");
  const targets = await listMerchantImportTargets();
  const configured = hasPublicDataServiceKey();

  return (
    <ImportRunProvider>
      <PageHeader
        title="업체 수집"
        description="지정한 시군구 · 업종의 업체를 공공데이터(소상공인 상가정보)에서 가져와 업체 목록에 추가해요."
        action={
          <div className="flex items-start gap-2">
            <RunAllImportsButton targetIds={targets.map(({ id }) => id)} />
            <AddImportTargetButton />
          </div>
        }
      />
      {!configured && (
        <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          공공데이터 서비스키(PUBLIC_DATA_SERVICE_KEY)가 아직 설정되지 않았어요. 키를 넣기 전에는 업종 목록을 불러오거나 수집할 수 없어요.
        </p>
      )}
      <div className="rounded-xl border bg-white px-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>지역</TableHead>
              <TableHead>업종</TableHead>
              <TableHead className="text-right">가져온 업체</TableHead>
              <TableHead>마지막 수집</TableHead>
              <TableHead>마지막 결과</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {targets.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-(--tertiary-color)">
                  수집 대상이 없어요.
                </TableCell>
              </TableRow>
            )}
            {targets.map((target) => (
              <TableRow key={target.id}>
                <TableCell>
                  <p className="font-medium">{target.signguName}</p>
                  <p className="text-xs text-(--tertiary-color)">{target.signguCode}</p>
                </TableCell>
                <TableCell className="max-w-64 whitespace-normal">{target.industryNames.join(", ")}</TableCell>
                <TableCell className="text-right tabular-nums">{target._count.merchants}</TableCell>
                <TableCell>{formatDateTime(target.lastSyncedAt)}</TableCell>
                <TableCell className="max-w-96 text-xs whitespace-normal">{describeResult(target.lastResult)}</TableCell>
                <TableCell>
                  <ImportTargetActions targetId={target.id} targetName={target.signguName} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ImportRunProvider>
  );
}
