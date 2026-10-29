"use client";

import { Badge, Button, FieldError, cn } from "@makkigo/ui";
import { Checkbox } from "@makkigo/ui/components/ui/checkbox";

import AppHeader from "@/components/layouts/AppHeader";

import { CONTRACT_STATUS_LABELS, formatMerchantAddress, formatRegisteredDate } from "../formatters";
import { useMerchantManagement } from "../hooks/useMerchantManagement";

import type { BoothMerchantListResponse } from "../schemas/merchants";
import type { MenuAccess } from "@/libs/auth/menuItems";

interface MerchantManagementProps {
  staffId: number;
  boothId: number;
  menu: MenuAccess;
  initialData: BoothMerchantListResponse;
}

const STATUS_TONES = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "danger",
} as const;
const HEADER_CELL_CLASS = "h-10 border-b px-2 text-sm font-semibold text-(--tertiary-color)";
const BODY_CELL_CLASS = "h-12 border-b px-2";

export default function MerchantManagement({
  staffId,
  boothId,
  menu,
  initialData,
}: Readonly<MerchantManagementProps>) {
  const management = useMerchantManagement({ staffId, boothId, initialData });
  const { detail } = management;

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col">
      <AppHeader menu={menu} />

      <h1 className="mt-4 text-xl font-bold text-(--base-color)">업체 관리</h1>

      <div className="mt-4 overflow-hidden rounded-xl border bg-white">
        <table className="w-full table-fixed text-left text-sm whitespace-nowrap text-(--base-color) [&_tbody_tr:last-child_td]:border-b-0">
          <thead>
            <tr>
              <th scope="col" className={cn(HEADER_CELL_CLASS, "w-12 pl-4")}>
                <Checkbox
                  aria-label="이 페이지의 업체 모두 선택"
                  checked={management.allSelected}
                  disabled={management.merchants.length === 0}
                  onCheckedChange={(checked) => management.toggleAll(checked === true)}
                />
              </th>
              <th scope="col" className={HEADER_CELL_CLASS}>업체명</th>
              <th scope="col" className={cn(HEADER_CELL_CLASS, "w-18")}>상태</th>
              <th scope="col" className={cn(HEADER_CELL_CLASS, "w-28 pr-4")}>등록일자</th>
            </tr>
          </thead>
          <tbody>
            {management.merchants.map((merchant) => (
              <tr
                key={merchant.id}
                className={cn("cursor-pointer", detail?.id === merchant.id && "bg-primary/5")}
                onClick={() => management.showDetail(merchant.id)}
              >
                <td className={cn(BODY_CELL_CLASS, "pl-4")}>
                  <Checkbox
                    aria-label={`${merchant.name} 선택`}
                    className="align-middle"
                    checked={management.isSelected(merchant.id)}
                    onCheckedChange={() => management.toggle(merchant.id)}
                    onClick={(event) => event.stopPropagation()}
                  />
                </td>
                <td className={cn(BODY_CELL_CLASS, "truncate")}>
                  <button
                    type="button"
                    aria-pressed={detail?.id === merchant.id}
                    className="block w-full cursor-pointer truncate text-left"
                    onClick={() => management.showDetail(merchant.id)}
                  >
                    {merchant.name}
                  </button>
                </td>
                <td className={BODY_CELL_CLASS}>
                  <Badge tone={STATUS_TONES[merchant.status]} className="px-2 py-0.5 text-xs">
                    {CONTRACT_STATUS_LABELS[merchant.status]}
                  </Badge>
                </td>
                <td className={cn(BODY_CELL_CLASS, "pr-4 tabular-nums")}>{formatRegisteredDate(merchant)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {management.listErrorMessage ? (
        <div className="mt-8 flex flex-col items-center gap-3">
          <FieldError>{management.listErrorMessage}</FieldError>
          <Button variant="outline" onClick={management.retryList}>
            다시 시도
          </Button>
        </div>
      ) : (
        management.merchants.length === 0 && (
          <p className="mt-8 text-center text-sm text-(--tertiary-color)">등록을 요청한 업체가 없어요.</p>
        )
      )}

      <nav aria-label="페이지" className="mt-6 mb-6 flex justify-center gap-1">
        {management.pages.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            aria-current={pageNumber === management.page ? "page" : undefined}
            className={cn(
              "size-8 rounded-lg text-sm font-medium text-(--base-color)",
              pageNumber === management.page && "bg-primary text-white",
            )}
            onClick={() => management.changePage(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}
      </nav>

      <section
        aria-label="업체 상세"
        className="mt-auto flex h-56 min-h-24 shrink flex-col justify-center gap-1 rounded-xl border bg-white px-5"
      >
        {detail && (
          <>
            <h2 className="truncate text-lg font-bold text-(--base-color)">{detail.name}</h2>
            <p className="truncate text-sm text-(--tertiary-color)">{formatMerchantAddress(detail)}</p>
            <Badge tone={STATUS_TONES[detail.status]} className="mt-1 self-start px-2 py-0.5 text-xs">
              {CONTRACT_STATUS_LABELS[detail.status]}
            </Badge>
          </>
        )}
      </section>

      <div aria-live="polite" className="flex min-h-11 shrink-0 flex-col justify-center py-2">
        {management.reviewErrorMessage && (
          <FieldError className="text-center">{management.reviewErrorMessage}</FieldError>
        )}
        {management.rejectBlockedByApproved && (
          <p className="text-center text-xs text-(--tertiary-color)">등록된 업체는 거절할 수 없어요</p>
        )}
        {management.notice && (
          <p className="rounded-xl bg-primary/10 px-4 py-2 text-center text-sm text-(--base-color)">
            {management.notice}
          </p>
        )}
      </div>

      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="outline"
          size="xl"
          className="flex-1 text-(--base-color)"
          disabled={!management.canReject}
          onClick={management.reject}
        >
          거절하기
        </Button>
        <Button
          type="button"
          size="xl"
          className="flex-1"
          disabled={!management.canAccept}
          onClick={management.accept}
        >
          수락하기
        </Button>
      </div>
    </div>
  );
}
