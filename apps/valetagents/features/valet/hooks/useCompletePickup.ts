"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { completePickup } from "../apis/completePickup";
import { boothValetSessionsQueryKey } from "./useBoothValetSessions";

const COMPLETE_ERROR_MESSAGE = "출차 완료로 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";

interface UseCompletePickupOptions {
  staffId: number;
  boothId: number;
  onCompleted: () => void;
}

const useCompletePickup = ({ staffId, boothId, onCompleted }: UseCompletePickupOptions) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (sessionId: number) => completePickup(boothId, sessionId),
    retry: false,
    networkMode: "always",
    onSuccess: onCompleted,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: boothValetSessionsQueryKey(staffId, boothId) }),
  });

  return {
    complete: (sessionId: number) => mutation.mutate(sessionId),
    isCompleting: mutation.isPending,
    errorMessage: mutation.error ? getErrorMessage(mutation.error, COMPLETE_ERROR_MESSAGE) : null,
    resetError: mutation.reset,
  };
};

export { useCompletePickup };
