import { getErrorMessage } from "@makkigo/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { formatClockTime } from "@/features/home/homeFormat";
import { delayArrival } from "@/features/valet/apis/delayArrival";
import {
  CURRENT_SESSION_QUERY_KEY,
  useCurrentSession,
} from "@/features/valet/hooks/useCurrentSession";
import { formatArrivalDelay, formatArrivalDelayLabel } from "@/libs/valet/arrivalDelay";
import { ARRIVAL_DELAY_MINUTES } from "@/libs/valet/contracts/arrival";

import type { DelayArrivalRequest } from "@/libs/valet/contracts/arrival";

type ArrivalDelayStep = "arrival-required" | "select" | "sent";
type ArrivalDelayMinutes = DelayArrivalRequest["minutes"];

interface ArrivalDelayOption {
  minutes: ArrivalDelayMinutes;
  label: string;
}

const FALLBACK_ERROR_MESSAGE = "지연 알림을 보내지 못했습니다.";

const DELAY_OPTIONS: ArrivalDelayOption[] = ARRIVAL_DELAY_MINUTES.map((minutes) => ({
  minutes,
  label: formatArrivalDelayLabel(minutes),
}));

const isDelayMinutes = (value: number | null): value is ArrivalDelayMinutes =>
  ARRIVAL_DELAY_MINUTES.some((minutes) => minutes === value);

interface UseArrivalDelayFlowOptions {
  onStartArrival: () => void;
}

const useArrivalDelayFlow = ({ onStartArrival }: UseArrivalDelayFlowOptions) => {
  const queryClient = useQueryClient();
  const { data } = useCurrentSession();
  const [step, setStep] = useState<ArrivalDelayStep | null>(null);
  const [selectedMinutes, setSelectedMinutes] = useState<ArrivalDelayMinutes | null>(null);
  const session = data?.session ?? null;
  const arrivingSession = session?.status === "ARRIVING" ? session : null;

  const mutation = useMutation({
    mutationFn: ({ id, minutes }: { id: number; minutes: ArrivalDelayMinutes }) =>
      delayArrival(id, { minutes }),
    onSuccess: () => setStep("sent"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: CURRENT_SESSION_QUERY_KEY }),
  });

  const open = () => {
    mutation.reset();

    if (!arrivingSession) {
      setStep("arrival-required");
      return;
    }

    const previousMinutes = arrivingSession.arrivalDelayMinutes;
    setSelectedMinutes(isDelayMinutes(previousMinutes) ? previousMinutes : null);
    setStep("select");
  };

  const close = () => setStep(null);

  const startArrival = () => {
    setStep(null);
    onStartArrival();
  };

  const send = () => {
    if (!arrivingSession || selectedMinutes === null) return;

    mutation.mutate({ id: arrivingSession.id, minutes: selectedMinutes });
  };

  const expectedArrivalAt = arrivingSession?.expectedArrivalAt ?? null;

  return {
    isArrivalRequiredOpen: step === "arrival-required",
    isSelectOpen: step === "select",
    isSentOpen: step === "sent",
    options: DELAY_OPTIONS,
    selectedMinutes,
    expectedArrivalTime:
      expectedArrivalAt === null ? null : formatClockTime(Date.parse(expectedArrivalAt)),
    sentDelayText:
      mutation.variables === undefined ? null : formatArrivalDelay(mutation.variables.minutes),
    isSending: mutation.isPending,
    errorMessage: mutation.isError ? getErrorMessage(mutation.error, FALLBACK_ERROR_MESSAGE) : null,
    open,
    close,
    select: setSelectedMinutes,
    send,
    startArrival,
  };
};

export { useArrivalDelayFlow };
export type { ArrivalDelayMinutes, ArrivalDelayOption };
