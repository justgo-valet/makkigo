"use client";

import { useState } from "react";

import { useAgentRequest } from "./useAgentRequest";
import { isOvernightWorkTime, isValidWorkTime } from "../schemas/onboarding";

import type {
  AgentRequestResponse,
  AgentRequestSummary,
  SelectedBooth,
} from "../schemas/onboarding";

type WorkTimeField = "start" | "end";

interface UseBoothRequestFormOptions {
  staffId: number;
  booth: SelectedBooth;
  request: AgentRequestSummary | null;
  notice: string | null;
  onSaved: (result: AgentRequestResponse) => void;
}

const getStatusNotice = (booth: SelectedBooth, request: AgentRequestSummary | null) => {
  if (request?.status === "REQUESTED") return `${booth.name}에 요원 등록을 요청했어요`;
  if (request?.status === "REJECTED") return "등록 요청이 거절됐어요. 다시 요청할 수 있어요";
  return null;
};

const useBoothRequestForm = ({
  staffId,
  booth,
  request,
  notice,
  onSaved,
}: UseBoothRequestFormOptions) => {
  const [workStartTime, setWorkStartTime] = useState<string | null>(request?.workStartTime ?? null);
  const [workEndTime, setWorkEndTime] = useState<string | null>(request?.workEndTime ?? null);
  const [editingField, setEditingField] = useState<WorkTimeField | null>(null);
  const agentRequest = useAgentRequest({ staffId, onSaved });

  const hasValidTimes = isValidWorkTime(workStartTime) && isValidWorkTime(workEndTime);
  const hasEqualTimes = hasValidTimes && workStartTime === workEndTime;
  const canSubmit = hasValidTimes && !hasEqualTimes && !agentRequest.isSaving;

  return {
    workStartTime,
    workEndTime,
    editingField,
    editingValue: editingField === "end" ? workEndTime : workStartTime,
    hasEqualTimes,
    isOvernight: hasValidTimes && isOvernightWorkTime(workStartTime, workEndTime),
    canSubmit,
    isSaving: agentRequest.isSaving,
    errorMessage: agentRequest.errorMessage,
    // 방금 저장한 결과 안내가 있으면 그것을, 없으면 요청 상태 안내를 보여 준다.
    notice: notice ?? getStatusNotice(booth, request),
    openPicker: (field: WorkTimeField) => {
      agentRequest.resetError();
      setEditingField(field);
    },
    closePicker: () => setEditingField(null),
    confirmTime: (value: string) => {
      if (editingField === "start") setWorkStartTime(value);
      if (editingField === "end") setWorkEndTime(value);
      setEditingField(null);
    },
    submit: () => {
      if (!hasValidTimes || hasEqualTimes || agentRequest.isSaving) return;
      agentRequest.save({ boothId: booth.id, workStartTime, workEndTime });
    },
  };
};

export { getStatusNotice, useBoothRequestForm };
export type { WorkTimeField };
