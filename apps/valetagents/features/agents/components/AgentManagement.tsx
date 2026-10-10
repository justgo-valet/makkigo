"use client";

import { Button, FieldError, cn } from "@makkigo/ui";
import { Checkbox } from "@makkigo/ui/components/ui/checkbox";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { useAgentReview } from "../hooks/useAgentReview";
import { useBoothAgents } from "../hooks/useBoothAgents";

import type { BoothAgent, BoothAgentListResponse, BoothAgentReviewBody } from "../schemas/agents";

interface AgentManagementProps {
  staffId: number;
  boothId: number;
  initialData: BoothAgentListResponse;
}

const STATUS_LABELS: Record<BoothAgent["status"], string> = {
  APPROVED: "등록",
  REQUESTED: "요청 중",
  REJECTED: "거절",
};

const REVIEW_NOTICES: Record<BoothAgentReviewBody["status"], string> = {
  APPROVED: "등록을 수락했어요",
  REJECTED: "등록을 거절했어요",
};

const CHECKBOX_CLASS =
  "block size-3 rounded-[4px] border-black bg-[#f7f4f4] shadow-none data-[state=checked]:border-black data-[state=checked]:bg-[#6676de] [&_svg]:hidden";
const HEADER_CELL_CLASS = "border-b border-black pt-0.5 align-top font-medium";
const BODY_CELL_CLASS = "border-b border-[#c2c2c2]";

const formatWorkTime = ({ workStartTime, workEndTime }: BoothAgent) =>
  workStartTime && workEndTime ? `${workStartTime} ~ ${workEndTime}` : "미설정";

const formatWorkStatus = ({ status, working }: BoothAgent) => {
  if (status !== "APPROVED") return "-";
  return working ? "근무 중" : "근무 외";
};

export default function AgentManagement({
  staffId,
  boothId,
  initialData,
}: Readonly<AgentManagementProps>) {
  const [page, setPage] = useState(initialData.page);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const list = useBoothAgents({ staffId, boothId, page, initialData });
  const review = useAgentReview({
    staffId,
    boothId,
    onReviewed: ({ status, agents }) => {
      setSelectedIds([]);
      setNotice(`${agents.length}명의 ${REVIEW_NOTICES[status]}`);
    },
  });

  const selectedAgents = list.agents.filter(({ id }) => selectedIds.includes(id));
  const allSelected = list.agents.length > 0 && selectedAgents.length === list.agents.length;
  // 등록된 요원은 거절할 수 없고, 다시 수락할 것도 없다.
  const hasApprovedSelected = selectedAgents.some(({ status }) => status === "APPROVED");
  const onlyApprovedSelected = selectedAgents.every(({ status }) => status === "APPROVED");

  const changeSelection = (ids: number[]) => {
    review.resetError();
    setNotice(null);
    setSelectedIds(ids);
  };

  const toggle = (id: number) =>
    changeSelection(
      selectedIds.includes(id) ? selectedIds.filter((selected) => selected !== id) : [...selectedIds, id],
    );

  const submit = (status: BoothAgentReviewBody["status"]) => {
    setNotice(null);
    review.review({
      status,
      agents: selectedAgents.map(({ id, updatedAt }) => ({ id, updatedAt })),
    });
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-2 pt-[25px] pb-8">
      <div className="fixed inset-0 -z-10 bg-[#f7f9fc]" />

      <header className="relative flex h-6 items-center justify-between">
        <Link href="/" aria-label="뒤로 가기">
          <Image src="/icons/chevron_left.svg" alt="" width={24} height={24} />
        </Link>
        <p className="absolute left-1/2 -translate-x-1/2 text-[32px] leading-none font-bold tracking-[-0.3px] text-(--primary-color)">
          MAKKIGO
        </p>
        <button type="button" aria-label="메뉴" className="-mr-1" disabled>
          <Image src="/icons/menu.svg" alt="" width={24} height={24} />
        </button>
      </header>

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
                  checked={allSelected}
                  disabled={list.agents.length === 0}
                  onCheckedChange={(checked) =>
                    changeSelection(checked === true ? list.agents.map(({ id }) => id) : [])
                  }
                />
              </th>
              <th scope="col" className={cn(HEADER_CELL_CLASS, "pl-[7px]")}>이름</th>
              <th scope="col" className={HEADER_CELL_CLASS}>근무시간</th>
              <th scope="col" className={HEADER_CELL_CLASS}>근무상태</th>
              <th scope="col" className={HEADER_CELL_CLASS}>등록상태</th>
            </tr>
          </thead>
          <tbody>
            {list.agents.map((agent) => (
              <tr key={agent.id} className="h-12 cursor-pointer" onClick={() => toggle(agent.id)}>
                <td className="p-0">
                  <Checkbox
                    aria-label={`${agent.name ?? "이름 없음"} 선택`}
                    className={cn(CHECKBOX_CLASS, "relative top-0.5")}
                    checked={selectedIds.includes(agent.id)}
                    onCheckedChange={() => toggle(agent.id)}
                    onClick={(event) => event.stopPropagation()}
                  />
                </td>
                <td className={cn(BODY_CELL_CLASS, "truncate pl-[7px]")}>{agent.name ?? "이름 없음"}</td>
                <td className={BODY_CELL_CLASS}>{formatWorkTime(agent)}</td>
                <td className={BODY_CELL_CLASS}>{formatWorkStatus(agent)}</td>
                <td className={BODY_CELL_CLASS}>{STATUS_LABELS[agent.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {list.errorMessage ? (
        <div className="mt-10 text-center">
          <FieldError>{list.errorMessage}</FieldError>
          <button type="button" className="mt-2 text-base text-[#575757] underline" onClick={() => void list.retry()}>
            다시 시도
          </button>
        </div>
      ) : (
        list.agents.length === 0 && (
          <p className="mt-10 text-center text-lg text-[#575757]">등록을 요청한 요원이 없어요.</p>
        )
      )}

      <div className="mt-auto pt-0.5">
        <div aria-live="polite">
          {review.errorMessage && (
            <FieldError className="mb-3 text-center">{review.errorMessage}</FieldError>
          )}
          {hasApprovedSelected && (
            <p className="mb-3 text-center text-xs leading-6 text-[#717171]">
              등록된 요원은 거절할 수 없어요
            </p>
          )}
          {notice && (
            <p className="mx-auto mb-3 max-w-[304px] rounded-lg bg-[rgba(129,169,218,0.2)] px-3 py-2 text-center text-xs leading-6 text-(--base-color)">
              {notice}
            </p>
          )}
        </div>

        {selectedAgents.length > 0 && (
          <div className="flex gap-[5px]">
            <Button
              type="button"
              variant="secondary"
              className="h-[65px] flex-1 rounded-[6px] text-lg font-medium text-white"
              disabled={review.isReviewing || hasApprovedSelected}
              onClick={() => submit("REJECTED")}
            >
              거절하기
            </Button>
            <Button
              type="button"
              className="h-[65px] flex-1 rounded-[6px] text-lg font-medium"
              disabled={review.isReviewing || onlyApprovedSelected}
              onClick={() => submit("APPROVED")}
            >
              수락하기
            </Button>
          </div>
        )}

        <nav aria-label="페이지" className="mt-[50px] flex justify-center gap-2">
          {Array.from({ length: list.totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              aria-current={pageNumber === page ? "page" : undefined}
              className={cn(
                "size-8 rounded text-lg leading-6 font-medium text-(--base-color)",
                pageNumber === page && "bg-primary text-white",
              )}
              onClick={() => {
                changeSelection([]);
                setPage(pageNumber);
              }}
            >
              {pageNumber}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
