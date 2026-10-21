import { getErrorMessage } from "@makkigo/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { formatClockTime } from "@/features/home/homeFormat";
import { delayArrival } from "@/features/valet/apis/delayArrival";
import {
  CURRENT_SESSION_QUERY_KEY,
  useCurrentSession,
} from "@/features/valet/hooks/useCurrentSession";
import { formatArrivalDelay } from "@/libs/valet/arrivalDelay";
import {
  ARRIVAL_DELAY_STEP_MINUTES,
  delayArrivalRequestSchema,
  MAX_ARRIVAL_DELAY_MINUTES,
} from "@/libs/valet/contracts/arrival";

type ArrivalDelayStep = "arrival-required" | "select" | "sent";

interface ArrivalDelayOption {
  minutes: number;
  label: string;
}

interface ArrivalDelayStepper {
  minutes: number;
  canDecrease: boolean;
  canIncrease: boolean;
}

const FALLBACK_ERROR_MESSAGE = "지연 알림을 보내지 못했습니다.";

/** 마지막 버튼("15분+")을 고르면 그 아래에서 5분 단위로 최대 60분까지 늘리고 줄인다. */
const DELAY_PRESET_MINUTES = [5, 10, 15] as const;
const STEPPER_MIN_MINUTES = DELAY_PRESET_MINUTES[DELAY_PRESET_MINUTES.length - 1];

const DELAY_OPTIONS: ArrivalDelayOption[] = DELAY_PRESET_MINUTES.map((minutes) => ({
  minutes,
  label: minutes === STEPPER_MIN_MINUTES ? `${minutes}분+` : `${minutes}분`,
}));

const isDelayMinutes = (value: number | null): value is number =>
  delayArrivalRequestSchema.shape.minutes.safeParse(value).success;

interface UseArrivalDelayFlowOptions {
  onStartArrival: () => void;
}

const useArrivalDelayFlow = ({ onStartArrival }: UseArrivalDelayFlowOptions) => {
  const queryClient = useQueryClient();
  const { data } = useCurrentSession();
  const [step, setStep] = useState<ArrivalDelayStep | null>(null);
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const session = data?.session ?? null;
  const arrivingSession = session?.status === "ARRIVING" ? session : null;

  const mutation = useMutation({
    mutationFn: ({ id, minutes }: { id: number; minutes: number }) => delayArrival(id, { minutes }),
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

  // 조절해 둔 값이 있으면 "15분+" 를 다시 눌러도 그대로 둔다.
  const select = (minutes: number) =>
    setSelectedMinutes((selected) =>
      minutes === STEPPER_MIN_MINUTES && selected !== null && selected >= STEPPER_MIN_MINUTES
        ? selected
        : minutes,
    );

  const changeBy = (delta: number) =>
    setSelectedMinutes((minutes) =>
      minutes === null
        ? minutes
        : Math.min(MAX_ARRIVAL_DELAY_MINUTES, Math.max(STEPPER_MIN_MINUTES, minutes + delta)),
    );

  const stepper: ArrivalDelayStepper | null =
    selectedMinutes !== null && selectedMinutes >= STEPPER_MIN_MINUTES
      ? {
          minutes: selectedMinutes,
          canDecrease: selectedMinutes > STEPPER_MIN_MINUTES,
          canIncrease: selectedMinutes < MAX_ARRIVAL_DELAY_MINUTES,
        }
      : null;

  const expectedArrivalAt = arrivingSession?.expectedArrivalAt ?? null;

  return {
    isArrivalRequiredOpen: step === "arrival-required",
    isSelectOpen: step === "select",
    isSentOpen: step === "sent",
    options: DELAY_OPTIONS,
    selectedOptionMinutes: stepper ? STEPPER_MIN_MINUTES : selectedMinutes,
    stepper,
    maxMinutes: MAX_ARRIVAL_DELAY_MINUTES,
    expectedArrivalTime:
      expectedArrivalAt === null ? null : formatClockTime(Date.parse(expectedArrivalAt)),
    sentDelayText:
      mutation.variables === undefined ? null : formatArrivalDelay(mutation.variables.minutes),
    isSending: mutation.isPending,
    errorMessage: mutation.isError ? getErrorMessage(mutation.error, FALLBACK_ERROR_MESSAGE) : null,
    open,
    close,
    select,
    decrease: () => changeBy(-ARRIVAL_DELAY_STEP_MINUTES),
    increase: () => changeBy(ARRIVAL_DELAY_STEP_MINUTES),
    send,
    startArrival,
  };
};

export { useArrivalDelayFlow };
export type { ArrivalDelayOption, ArrivalDelayStepper };
