"use client";

import { useState } from "react";

import { STAFF_NAME_MAX_LENGTH } from "@/libs/booth/contracts/agent-request";

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
  staffName: string | null;
  onSaved: (result: AgentRequestResponse) => void;
}

const getRejectedNotice = (request: AgentRequestSummary | null) =>
  request?.status === "REJECTED" ? "등록 요청이 거절됐어요. 다시 요청할 수 있어요" : null;

const useBoothRequestForm = ({
  staffId,
  booth,
  request,
  staffName,
  onSaved,
}: UseBoothRequestFormOptions) => {
  const [name, setName] = useState(staffName ?? "");
  const [workStartTime, setWorkStartTime] = useState<string | null>(request?.workStartTime ?? null);
  const [workEndTime, setWorkEndTime] = useState<string | null>(request?.workEndTime ?? null);
  const [editingField, setEditingField] = useState<WorkTimeField | null>(null);
  const agentRequest = useAgentRequest({ staffId, onSaved });

  const hasValidTimes = isValidWorkTime(workStartTime) && isValidWorkTime(workEndTime);
  const hasEqualTimes = hasValidTimes && workStartTime === workEndTime;
  const trimmedName = name.trim();
  const canSubmit =
    trimmedName !== "" && hasValidTimes && !hasEqualTimes && !agentRequest.isSaving;

  return {
    name,
    nameMaxLength: STAFF_NAME_MAX_LENGTH,
    changeName: (value: string) => {
      agentRequest.resetError();
      setName(value);
    },
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
      if (!canSubmit) return;
      agentRequest.save({ boothId: booth.id, name: trimmedName, workStartTime, workEndTime });
    },
  };
};

export { getRejectedNotice, useBoothRequestForm };
export type { WorkTimeField };
