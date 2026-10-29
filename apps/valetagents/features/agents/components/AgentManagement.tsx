"use client";

import { Badge, Button, FieldError, cn } from "@makkigo/ui";
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

const STATUS_TONES = {
  APPROVED: "success",
  REQUESTED: "warning",
  REJECTED: "danger",
} as const;
const HEADER_CELL_CLASS = "h-10 border-b px-1.5 text-sm font-semibold text-(--tertiary-color)";
const BODY_CELL_CLASS = "h-12 border-b px-1.5";

export default function AgentManagement({
  staffId,
  boothId,
  initialData,
  menu,
}: Readonly<AgentManagementProps>) {
  const management = useAgentManagement({ staffId, boothId, initialData });

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
      <AppHeader menu={menu} backHref="/" />

      <h1 className="mt-4 text-xl font-bold text-(--base-color)">요원 관리</h1>

      <div className="mt-4 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-85 table-fixed text-left text-sm whitespace-nowrap text-(--base-color) [&_tbody_tr:last-child_td]:border-b-0">
          <thead>
            <tr>
              <th className={cn(HEADER_CELL_CLASS, "w-9 pl-3")}>
                <Checkbox
                  aria-label="이 페이지의 요원 모두 선택"
                  checked={management.allSelected}
                  disabled={management.agents.length === 0}
                  onCheckedChange={(checked) => management.toggleAll(checked === true)}
                />
              </th>
              <th scope="col" className={HEADER_CELL_CLASS}>이름</th>
              <th scope="col" className={cn(HEADER_CELL_CLASS, "w-24")}>근무시간</th>
              <th scope="col" className={cn(HEADER_CELL_CLASS, "w-18")}>근무상태</th>
              <th scope="col" className={cn(HEADER_CELL_CLASS, "w-20 pr-3")}>등록상태</th>
            </tr>
          </thead>
          <tbody>
            {management.agents.map((agent) => (
              <tr
                key={agent.id}
                className="cursor-pointer"
                onClick={() => management.toggle(agent.id)}
              >
                <td className={cn(BODY_CELL_CLASS, "pl-3")}>
                  <Checkbox
                    aria-label={`${formatAgentName(agent)} 선택`}
                    className="align-middle"
                    checked={management.isSelected(agent.id)}
                    onCheckedChange={() => management.toggle(agent.id)}
                    onClick={(event) => event.stopPropagation()}
                  />
                </td>
                <td className={BODY_CELL_CLASS}>
                  <span className="line-clamp-2 break-keep whitespace-normal wrap-anywhere">
                    {formatAgentName(agent)}
                  </span>
                </td>
                <td className={cn(BODY_CELL_CLASS, "tabular-nums")}>{formatWorkTime(agent)}</td>
                <td className={BODY_CELL_CLASS}>{formatWorkStatus(agent)}</td>
                <td className={cn(BODY_CELL_CLASS, "pr-3")}>
                  <Badge tone={STATUS_TONES[agent.status]} className="px-2 py-0.5 text-xs">
                    {REGISTRATION_STATUS_LABELS[agent.status]}
                  </Badge>
                </td>
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
        management.agents.length === 0 && (
          <p className="mt-8 text-center text-sm text-(--tertiary-color)">등록을 요청한 요원이 없어요.</p>
        )
      )}

      <div className="mt-auto pt-6">
        <div aria-live="polite">
          {management.reviewErrorMessage && (
            <FieldError className="mb-3 text-center">{management.reviewErrorMessage}</FieldError>
          )}
          {management.rejectBlockedByApproved && (
            <p className="mb-3 text-center text-xs text-(--tertiary-color)">
              등록된 요원은 거절할 수 없어요
            </p>
          )}
          {management.notice && (
            <p className="mb-3 rounded-xl bg-primary/10 px-4 py-2 text-center text-sm text-(--base-color)">
              {management.notice}
            </p>
          )}
        </div>

        {management.hasSelection && (
          <div className="flex gap-2">
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
        )}

        <nav aria-label="페이지" className="mt-6 flex justify-center gap-1">
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
      </div>
    </div>
  );
}
