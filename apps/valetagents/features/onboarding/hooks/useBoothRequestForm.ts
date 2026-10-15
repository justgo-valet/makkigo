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
  onSaved: (result: AgentRequestResponse) => void;
}

const getRejectedNotice = (request: AgentRequestSummary | null) =>
  request?.status === "REJECTED" ? "등록 요청이 거절됐어요. 다시 요청할 수 있어요" : null;

const useBoothRequestForm = ({
  staffId,
  booth,
  request,
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
    rejectedNotice: getRejectedNotice(request),
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

export { getRejectedNotice, useBoothRequestForm };
export type { WorkTimeField };
