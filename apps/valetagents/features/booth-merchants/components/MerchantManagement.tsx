"use client";

import { Button, FieldError, cn } from "@makkigo/ui";
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

const CHECKBOX_CLASS =
  "size-3 rounded-[4px] border-black bg-[#f7f4f4] shadow-none data-[state=checked]:border-black data-[state=checked]:bg-[#6676de] data-[state=checked]:text-white [&_svg]:size-2.5";
const HEADER_CELL_CLASS = "border-b border-black pt-0.5 align-top font-medium";
const BODY_CELL_CLASS = "border-b border-[#c2c2c2]";

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

      <h1 className="mt-[34px] pl-1.5 text-2xl leading-6 font-medium text-(--base-color)">업체 관리</h1>

      <table className="mt-5 -ml-px w-full table-fixed border-separate border-spacing-0 text-left text-base leading-6 font-medium whitespace-nowrap text-(--base-color)">
        <colgroup>
          <col className="w-[38px]" />
          <col className="w-[123px]" />
          <col className="w-[67px]" />
          <col />
        </colgroup>
        <thead>
          <tr className="h-8">
            <th scope="col" className="border-b border-black py-0 pr-0 pl-[7px]">
              <Checkbox
                aria-label="이 페이지의 업체 모두 선택"
                className={CHECKBOX_CLASS}
                checked={management.allSelected}
                disabled={management.merchants.length === 0}
                onCheckedChange={(checked) => management.toggleAll(checked === true)}
              />
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>업체명</th>
            <th scope="col" className={HEADER_CELL_CLASS}>상태</th>
            <th scope="col" className={HEADER_CELL_CLASS}>등록일자</th>
          </tr>
        </thead>
        <tbody>
          {management.merchants.map((merchant) => (
            <tr
              key={merchant.id}
              className="h-12 cursor-pointer"
              onClick={() => management.showDetail(merchant.id)}
            >
              <td className={cn(BODY_CELL_CLASS, "py-0 pr-0 pl-[7px]")}>
                <Checkbox
                  aria-label={`${merchant.name} 선택`}
                  className={cn(CHECKBOX_CLASS, "relative top-px")}
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
              <td className={BODY_CELL_CLASS}>{CONTRACT_STATUS_LABELS[merchant.status]}</td>
              <td className={BODY_CELL_CLASS}>{formatRegisteredDate(merchant)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {management.listErrorMessage ? (
        <div className="mt-10 text-center">
          <FieldError>{management.listErrorMessage}</FieldError>
          <button
            type="button"
            className="mt-2 text-base text-[#575757] underline"
            onClick={management.retryList}
          >
            다시 시도
          </button>
        </div>
      ) : (
        management.merchants.length === 0 && (
          <p className="mt-10 text-center text-lg text-[#575757]">등록을 요청한 업체가 없어요.</p>
        )
      )}

      <nav aria-label="페이지" className="mt-7 -mr-[3px] mb-[60px] ml-[3px] flex justify-center gap-2">
        {management.pages.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            aria-current={pageNumber === management.page ? "page" : undefined}
            className={cn(
              "size-8 rounded text-lg leading-6 font-medium text-(--base-color)",
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
        className="mt-auto -mr-[3px] ml-[3px] flex h-56 min-h-24 shrink flex-col justify-center rounded-[8px] bg-[#d9d9d9] px-5"
      >
        {detail && (
          <>
            <h2 className="truncate text-2xl leading-6 font-medium text-(--base-color)">{detail.name}</h2>
            <p className="mt-[9px] truncate text-sm leading-6 text-[#717171]">
              {formatMerchantAddress(detail)}
            </p>
            <p className="mt-1 text-base leading-6 font-medium text-(--base-color)">
              {CONTRACT_STATUS_LABELS[detail.status]}
            </p>
          </>
        )}
      </section>

      <div aria-live="polite" className="flex min-h-[42px] shrink-0 flex-col justify-center">
        {management.reviewErrorMessage && (
          <FieldError className="text-center">{management.reviewErrorMessage}</FieldError>
        )}
        {management.rejectBlockedByApproved && (
          <p className="text-center text-xs leading-6 text-[#717171]">등록된 업체는 거절할 수 없어요</p>
        )}
        {management.notice && (
          <p className="mx-auto max-w-[304px] rounded-lg bg-[rgba(129,169,218,0.2)] px-3 py-2 text-center text-xs leading-6 text-(--base-color)">
            {management.notice}
          </p>
        )}
      </div>

      <div className="mr-px -ml-px flex shrink-0 gap-[5px]">
        <Button
          type="button"
          variant="secondary"
          className="h-[65px] flex-1 rounded-[6px] text-lg font-medium text-white"
          disabled={!management.canReject}
          onClick={management.reject}
        >
          거절하기
        </Button>
        <Button
          type="button"
          className="h-[65px] flex-1 rounded-[6px] text-lg font-medium"
          disabled={!management.canAccept}
          onClick={management.accept}
        >
          수락하기
        </Button>
      </div>
    </div>
  );
}
