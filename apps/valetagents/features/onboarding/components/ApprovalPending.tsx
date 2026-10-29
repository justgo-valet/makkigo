"use client";

import { Badge, Button, FieldError } from "@makkigo/ui";

import {
  REQUEST_STATUS_LABELS,
  formatAddress,
  formatFeePolicy,
  formatWorkTime,
  getRequestActionLabel,
} from "../formatters";

import type { AgentRequestSummary } from "../schemas/onboarding";

const STATUS_TONES = {
  REQUESTED: "warning",
  APPROVED: "success",
  REJECTED: "danger",
} as const;

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
      <h1 className="text-xl font-bold text-(--base-color)">부스 승인을 기다리고 있어요</h1>
      <p className="mt-1 text-sm text-(--tertiary-color)">
        관리자가 승인하면 자동으로 메인 화면으로 이동해요
      </p>

      <div aria-live="polite">
        {pollErrorMessage && (
          <div className="mt-5 rounded-xl border bg-white px-4 py-3 text-center">
            <FieldError>{pollErrorMessage}</FieldError>
            <button type="button" className="mt-1 text-sm text-(--tertiary-color) underline" onClick={onRetry}>
              상태 다시 확인
            </button>
          </div>
        )}
      </div>

      <ul className="mt-6 flex flex-col gap-3">
        {requests.map((request) => (
          <li key={request.id} className="rounded-xl border bg-white p-4 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-(--base-color)">
                  {request.booth.name}
                </h2>
                <p className="mt-0.5 text-xs text-(--tertiary-color)">{formatAddress(request.booth)}</p>
              </div>
              <Badge tone={STATUS_TONES[request.status]} className="px-2 py-0.5 text-xs">
                {REQUEST_STATUS_LABELS[request.status]}
              </Badge>
            </div>
            <dl className="mt-3 text-sm leading-6 text-(--base-color)">
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 text-(--tertiary-color)">근무 시간</dt>
                <dd>{formatWorkTime(request.workStartTime, request.workEndTime)}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 text-(--tertiary-color)">발렛 비용</dt>
                <dd>{formatFeePolicy(request.booth.feePolicy)}</dd>
              </div>
            </dl>
            {request.status !== "APPROVED" && (
              <Button
                type="button"
                variant="outline"
                size="xl"
                className="mt-4 w-full text-(--base-color)"
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
          size="xl"
          className="w-full"
          onClick={onRequestAnother}
        >
          다른 부스 요청하기
        </Button>
      </div>
    </div>
  );
}
