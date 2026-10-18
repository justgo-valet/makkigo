import { getErrorMessage } from "@makkigo/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { formatClockTime } from "@/features/home/homeFormat";
import { requestPickup } from "@/features/valet/apis/requestPickup";
import { useBankTransfer } from "@/features/valet/hooks/useBankTransfer";
import {
  CURRENT_SESSION_QUERY_KEY,
  useCurrentSession,
} from "@/features/valet/hooks/useCurrentSession";
import { toValetFeeView } from "@/features/valet/valetFeeFormat";

import type { CurrentSession } from "@/libs/valet/contracts/currentSession";

type PickupRequestStep = "no-session" | "not-parked" | "fee" | "accepted";
type FeeDetailMode = "request" | "view";

const FALLBACK_ERROR_MESSAGE = "출차 요청을 보내지 못했습니다. 다시 시도해주세요.";

const isPickupStatus = (session: CurrentSession) =>
  session.status === "PICKUP_REQUESTED" || session.status === "PICKUP_PREPARING";

const getFeeDescription = (session: CurrentSession | null) =>
  session && isPickupStatus(session)
    ? "출차 요청 시각 기준 요금입니다. 실제 요금은 요원님이 안내해요."
    : "지금 출차하실 경우 기준입니다. 출차 시각에 따라 달라져요.";

const usePickupRequestFlow = () => {
  const [step, setStep] = useState<PickupRequestStep | null>(null);
  const [feeMode, setFeeMode] = useState<FeeDetailMode>("view");
  const [isFeeExpanded, setIsFeeExpanded] = useState(false);
  const queryClient = useQueryClient();
  const currentSession = useCurrentSession().data?.session ?? null;
  const { mutate, isPending, error, reset, data } = useMutation({
    mutationFn: requestPickup,
    onSuccess: () => {
      setIsFeeExpanded(false);
      setStep("accepted");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CURRENT_SESSION_QUERY_KEY }),
  });
  const acceptedSession = data?.session ?? currentSession;
  const bankAccount = acceptedSession?.bankAccount ?? null;
  const bankTransfer = useBankTransfer(
    bankAccount && { bankName: bankAccount.bankName, accountNumber: bankAccount.accountNumber },
    acceptedSession?.actualFee ?? acceptedSession?.fee?.total ?? null,
  );

  const open = () => {
    reset();

    if (!currentSession) return setStep("no-session");
    if (currentSession.status === "ARRIVING") return setStep("not-parked");
    if (isPickupStatus(currentSession)) return setStep("accepted");

    setFeeMode("request");
    setStep("fee");
  };

  const openFeeDetail = () => {
    if (!currentSession || currentSession.status === "ARRIVING") return;

    reset();
    setFeeMode("view");
    setStep("fee");
  };

  const close = () => {
    if (isPending) return;
    setStep(null);
  };

  const confirmFee = () => {
    if (feeMode === "view" || !currentSession) return close();
    if (isPending) return;

    mutate(currentSession.id);
  };

  const feeSession = step === "fee" ? currentSession : acceptedSession;
  const fee = feeSession?.fee ?? null;
  const expectedPickupAt = acceptedSession?.expectedPickupAt ?? null;

  return {
    isNoSessionOpen: step === "no-session",
    isNotParkedOpen: step === "not-parked",
    isFeeOpen: step === "fee",
    isAcceptedOpen: step === "accepted",
    feeDescription: getFeeDescription(currentSession),
    fee: fee && toValetFeeView(fee),
    isRequesting: isPending,
    errorMessage: error && getErrorMessage(error, FALLBACK_ERROR_MESSAGE),
    pickupTimeLabel:
      expectedPickupAt === null
        ? "요원님 확인 후 시각 안내"
        : `${formatClockTime(Date.parse(expectedPickupAt))} 출차 예정`,
    accountLabel: bankTransfer.accountLabel,
    bankTransfer,
    isFeeExpanded,
    open,
    openFeeDetail,
    close,
    confirmFee,
    toggleFee: () => setIsFeeExpanded((expanded) => !expanded),
  };
};

type PickupRequestFlow = ReturnType<typeof usePickupRequestFlow>;

export { usePickupRequestFlow };
export type { PickupRequestFlow };
