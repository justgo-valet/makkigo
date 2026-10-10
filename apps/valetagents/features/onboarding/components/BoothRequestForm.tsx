"use client";

import { Button, FieldError, TimePickerSheet } from "@makkigo/ui";
import { useState } from "react";

import BoothMap from "./BoothMap";
import OnboardingLinks from "./OnboardingLinks";
import { formatDuration, formatFee } from "../formatters";
import { useAgentRequest } from "../hooks/useAgentRequest";
import { isOvernightWorkTime, isValidWorkTime } from "../schemas/onboarding";

import type {
  AgentRequestResponse,
  AgentRequestSummary,
  SelectedBooth,
} from "../schemas/onboarding";

interface BoothRequestFormProps {
  staffId: number;
  booth: SelectedBooth;
  request: AgentRequestSummary | null;
  notice: string | null;
  kakaoMapAppKey: string;
  canReturnToPending: boolean;
  onShowPending: () => void;
  onSaved: (result: AgentRequestResponse) => void;
}

type EditingTime = "start" | "end" | null;

const getActionLabel = (request: AgentRequestSummary | null) => {
  if (request?.status === "REQUESTED") return "요청 내용 수정";
  if (request?.status === "REJECTED") return "다시 요청하기";
  return "등록 요청하기";
};

const getStatusNotice = (booth: SelectedBooth, request: AgentRequestSummary | null) => {
  if (request?.status === "REQUESTED") return `${booth.name}에 요원 등록을 요청했어요`;
  if (request?.status === "REJECTED") return "등록 요청이 거절됐어요. 다시 요청할 수 있어요";
  return null;
};

export default function BoothRequestForm({
  staffId,
  booth,
  request,
  notice,
  kakaoMapAppKey,
  canReturnToPending,
  onShowPending,
  onSaved,
}: Readonly<BoothRequestFormProps>) {
  const [workStartTime, setWorkStartTime] = useState<string | null>(request?.workStartTime ?? null);
  const [workEndTime, setWorkEndTime] = useState<string | null>(request?.workEndTime ?? null);
  const [editingTime, setEditingTime] = useState<EditingTime>(null);
  const agentRequest = useAgentRequest({ staffId, onSaved });

  const hasValidTimes = isValidWorkTime(workStartTime) && isValidWorkTime(workEndTime);
  const hasEqualTimes = hasValidTimes && workStartTime === workEndTime;
  const isOvernight = hasValidTimes && isOvernightWorkTime(workStartTime, workEndTime);
  const displayedNotice = notice ?? getStatusNotice(booth, request);
  const feePolicy = booth.feePolicy;

  const openPicker = (target: "start" | "end") => {
    agentRequest.resetError();
    setEditingTime(target);
  };

  return (
    <form
      className="flex flex-1 flex-col pt-[17px]"
      onSubmit={(event) => {
        event.preventDefault();
        if (!hasValidTimes || hasEqualTimes || agentRequest.isSaving) return;
        agentRequest.save({ boothId: booth.id, workStartTime, workEndTime });
      }}
    >
      <BoothMap address={booth.address} appKey={kakaoMapAppKey} />

      <h1 className="mt-[26px] text-2xl leading-6 font-medium text-(--base-color)">{booth.name}</h1>
      <p className="mt-[9px] text-sm leading-6 text-[#717171]">
        {[booth.address, booth.addressDetail].filter(Boolean).join(" ")}
      </p>

      <h2 className="mt-5 text-xl leading-6 font-medium text-[#333]">발렛 비용</h2>
      <p className="mt-[3px] text-xs leading-6 text-[#717171]">
        발렛부스에서 설정된 비용이에요. 요원 등록 후 수정이 가능해요
      </p>
      {feePolicy ? (
        <p className="mt-1 text-lg leading-[26px] text-(--base-color)">
          기본요금 <Emphasis>{formatDuration(feePolicy.baseMinutes)}</Emphasis>{" "}
          <Emphasis>{formatFee(feePolicy.baseFee)}</Emphasis> 원
          <br />
          추가요금 <Emphasis>{formatDuration(feePolicy.extraUnitMinutes)}</Emphasis> 당{" "}
          <Emphasis>{formatFee(feePolicy.extraUnitFee)}</Emphasis> 원
        </p>
      ) : (
        <p className="mt-1 text-lg leading-[26px] text-[#717171]">요금 정보가 아직 등록되지 않았어요</p>
      )}

      <fieldset className="mt-3.5">
        <legend className="text-xl leading-6 font-medium text-[#333]">
          근무 시간을 입력해 주세요
          <span aria-hidden className="ml-1 align-top text-[#ff1515]">*</span>
        </legend>
        <div className="mt-4 flex items-center justify-between gap-3">
          <TimeField label="출근 시간" value={workStartTime} onClick={() => openPicker("start")} />
          <span aria-hidden className="text-2xl font-medium text-[#333]">~</span>
          <TimeField label="퇴근 시간" value={workEndTime} onClick={() => openPicker("end")} />
        </div>
        {hasEqualTimes && <FieldError className="mt-2">출근과 퇴근 시간은 달라야 합니다.</FieldError>}
        {isOvernight && <p className="mt-2 text-xs leading-6 text-[#717171]">퇴근은 다음 날이에요.</p>}
      </fieldset>

      <div aria-live="polite">
        {displayedNotice && (
          <p className="mx-auto mt-5 max-w-[304px] rounded-lg bg-[rgba(129,169,218,0.2)] px-3 py-2 text-center text-xs leading-6 text-(--base-color)">
            {displayedNotice}
          </p>
        )}
      </div>

      <div className="mt-auto pt-6">
        {agentRequest.errorMessage && (
          <FieldError className="mb-3 text-center">{agentRequest.errorMessage}</FieldError>
        )}
        <Button
          type="submit"
          className="h-14 w-full rounded-[6px] text-lg font-medium"
          disabled={!hasValidTimes || hasEqualTimes || agentRequest.isSaving}
        >
          {agentRequest.isSaving ? "저장하고 있어요" : getActionLabel(request)}
        </Button>
        <OnboardingLinks
          canReturnToPending={canReturnToPending}
          onShowPending={onShowPending}
          className="mt-[15px] text-base"
        />
      </div>

      <TimePickerSheet
        open={editingTime !== null}
        onOpenChange={(open) => {
          if (!open) setEditingTime(null);
        }}
        value={editingTime === "end" ? workEndTime : workStartTime}
        onConfirm={(value) => {
          if (editingTime === "start") setWorkStartTime(value);
          if (editingTime === "end") setWorkEndTime(value);
          setEditingTime(null);
        }}
        title={editingTime === "end" ? "퇴근 시간" : "출근 시간"}
        description={
          editingTime === "end"
            ? "퇴근 시간에 자동으로 마끼고 알림이 꺼져요"
            : "출근 시간에 자동으로 마끼고 알림을 받을 수 있어요"
        }
      />
    </form>
  );
}

function Emphasis({ children }: Readonly<{ children: string }>) {
  return <span className="text-(--secondary-color)">{children}</span>;
}

function TimeField({
  label,
  value,
  onClick,
}: Readonly<{ label: string; value: string | null; onClick: () => void }>) {
  return (
    <button
      type="button"
      aria-label={`${label} ${value ?? "선택"}`}
      className="h-14 w-full max-w-[140px] min-w-0 rounded-lg border border-[#d8d8d8] bg-white text-[28px] leading-none text-black tabular-nums outline-none focus-visible:border-(--primary-color)"
      onClick={onClick}
    >
      {value?.replace(":", " : ")}
    </button>
  );
}
