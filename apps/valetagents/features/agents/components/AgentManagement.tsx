"use client";

import { Button, FieldError, cn } from "@makkigo/ui";
import { Checkbox } from "@makkigo/ui/components/ui/checkbox";

import AppHeader from "@/components/layouts/AppHeader";

import {
  REGISTRATION_STATUS_LABELS,
  formatAgentName,
  formatWorkStatus,
  formatWorkTime,
} from "../formatters";
import { useAgentManagement } from "../hooks/useAgentManagement";

import type { MenuAccess } from "@/libs/auth/menuItems";
import type { BoothAgentListResponse } from "../schemas/agents";

interface AgentManagementProps {
  staffId: number;
  boothId: number;
  initialData: BoothAgentListResponse;
  menu: MenuAccess;
}

const CHECKBOX_CLASS =
  "block size-3 rounded-[4px] border-black bg-[#f7f4f4] shadow-none data-[state=checked]:border-black data-[state=checked]:bg-[#6676de] [&_svg]:hidden";
const HEADER_CELL_CLASS = "border-b border-black pt-0.5 align-top font-medium";
const BODY_CELL_CLASS = "border-b border-[#c2c2c2]";

export default function AgentManagement({
  staffId,
  boothId,
  initialData,
  menu,
}: Readonly<AgentManagementProps>) {
  const management = useAgentManagement({ staffId, boothId, initialData });

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-2 pb-8">
      <div className="fixed inset-0 -z-10 bg-[#f7f9fc]" />

      <AppHeader menu={menu} backHref="/" />

      <h1 className="mt-[34px] pl-1.5 text-2xl leading-6 font-medium text-(--base-color)">요원 관리</h1>

      <div className="mt-5 -ml-[13px] overflow-x-auto">
        <table className="w-[357px] min-w-full table-fixed border-separate border-spacing-0 text-left text-base leading-6 font-medium whitespace-nowrap text-(--base-color)">
          <colgroup>
            <col className="w-3" />
            <col className="w-[76px]" />
            <col className="w-[114px]" />
            <col className="w-[77px]" />
            <col />
          </colgroup>
          <thead>
            <tr className="h-8">
              <th className="p-0">
                <Checkbox
                  aria-label="이 페이지의 요원 모두 선택"
                  className={CHECKBOX_CLASS}
                  checked={management.allSelected}
                  disabled={management.agents.length === 0}
                  onCheckedChange={(checked) => management.toggleAll(checked === true)}
                />
              </th>
              <th scope="col" className={cn(HEADER_CELL_CLASS, "pl-[7px]")}>이름</th>
              <th scope="col" className={HEADER_CELL_CLASS}>근무시간</th>
              <th scope="col" className={HEADER_CELL_CLASS}>근무상태</th>
              <th scope="col" className={HEADER_CELL_CLASS}>등록상태</th>
            </tr>
          </thead>
          <tbody>
            {management.agents.map((agent) => (
              <tr
                key={agent.id}
                className="h-12 cursor-pointer"
                onClick={() => management.toggle(agent.id)}
              >
                <td className="p-0">
                  <Checkbox
                    aria-label={`${formatAgentName(agent)} 선택`}
                    className={cn(CHECKBOX_CLASS, "relative top-0.5")}
                    checked={management.isSelected(agent.id)}
                    onCheckedChange={() => management.toggle(agent.id)}
                    onClick={(event) => event.stopPropagation()}
                  />
                </td>
                <td className={cn(BODY_CELL_CLASS, "truncate pl-[7px]")}>{formatAgentName(agent)}</td>
                <td className={BODY_CELL_CLASS}>{formatWorkTime(agent)}</td>
                <td className={BODY_CELL_CLASS}>{formatWorkStatus(agent)}</td>
                <td className={BODY_CELL_CLASS}>{REGISTRATION_STATUS_LABELS[agent.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
        management.agents.length === 0 && (
          <p className="mt-10 text-center text-lg text-[#575757]">등록을 요청한 요원이 없어요.</p>
        )
      )}

      <div className="mt-auto pt-0.5">
        <div aria-live="polite">
          {management.reviewErrorMessage && (
            <FieldError className="mb-3 text-center">{management.reviewErrorMessage}</FieldError>
          )}
          {management.rejectBlockedByApproved && (
            <p className="mb-3 text-center text-xs leading-6 text-[#717171]">
              등록된 요원은 거절할 수 없어요
            </p>
          )}
          {management.notice && (
            <p className="mx-auto mb-3 max-w-[304px] rounded-lg bg-[rgba(129,169,218,0.2)] px-3 py-2 text-center text-xs leading-6 text-(--base-color)">
              {management.notice}
            </p>
          )}
        </div>

        {management.hasSelection && (
          <div className="flex gap-[5px]">
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
        )}

        <nav aria-label="페이지" className="mt-[50px] flex justify-center gap-2">
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
      </div>
    </div>
  );
}
