"use client";

import { Button, FieldError, cn } from "@makkigo/ui";

import {
  REQUEST_STATUS_LABELS,
  formatAddress,
  formatFeePolicy,
  formatWorkTime,
  getRequestActionLabel,
} from "../formatters";

import type { AgentRequestSummary } from "../schemas/onboarding";

interface ApprovalPendingProps {
  requests: AgentRequestSummary[];
  pollErrorMessage: string | null;
  onEdit: (request: AgentRequestSummary) => void;
  onRequestAnother: () => void;
  onRetry: () => void;
}

export default function ApprovalPending({
  requests,
  pollErrorMessage,
  onEdit,
  onRequestAnother,
  onRetry,
}: Readonly<ApprovalPendingProps>) {
  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-2xl leading-8 font-medium text-(--base-color)">부스 승인을 기다리고 있어요</h1>
      <p className="mt-[9px] text-sm leading-6 text-[#717171]">
        관리자가 승인하면 자동으로 메인 화면으로 이동해요
      </p>

      <div aria-live="polite">
        {pollErrorMessage && (
          <div className="mt-5 rounded-lg border border-[#d8d8d8] bg-white px-4 py-3 text-center">
            <FieldError>{pollErrorMessage}</FieldError>
            <button type="button" className="mt-1 text-sm text-[#575757] underline" onClick={onRetry}>
              상태 다시 확인
            </button>
          </div>
        )}
      </div>

      <ul className="mt-6 flex flex-col gap-3">
        {requests.map((request) => (
          <li key={request.id} className="rounded-lg border border-[#d8d8d8] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg leading-6 font-medium text-(--base-color)">
                  {request.booth.name}
                </h2>
                <p className="text-xs leading-6 text-[#717171]">{formatAddress(request.booth)}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-lg bg-[rgba(129,169,218,0.2)] px-2.5 text-xs leading-6 text-(--base-color)",
                  request.status === "REJECTED" && "bg-[rgba(255,21,21,0.1)] text-[#ff1515]",
                )}
              >
                {REQUEST_STATUS_LABELS[request.status]}
              </span>
            </div>
            <dl className="mt-3 text-sm leading-6 text-(--base-color)">
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 text-[#717171]">근무 시간</dt>
                <dd>{formatWorkTime(request.workStartTime, request.workEndTime)}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 text-[#717171]">발렛 비용</dt>
                <dd>{formatFeePolicy(request.booth.feePolicy)}</dd>
              </div>
            </dl>
            {request.status !== "APPROVED" && (
              <Button
                type="button"
                variant="outline"
                className="mt-4 h-12 w-full rounded-[6px] border-[#d8d8d8] text-base font-medium text-(--base-color) shadow-none"
                onClick={() => onEdit(request)}
              >
                {getRequestActionLabel(request.status)}
              </Button>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">
        <Button
          type="button"
          className="h-14 w-full rounded-[6px] text-lg font-medium"
          onClick={onRequestAnother}
        >
          다른 부스 요청하기
        </Button>
      </div>
    </div>
  );
}
