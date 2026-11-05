"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateCompletedFee } from "../apis/updateCompletedFee";
import { boothValetSessionsQueryKey } from "./useBoothValetSessions";

const UPDATE_ERROR_MESSAGE = "금액을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.";

interface UseUpdateCompletedFeeOptions {
  staffId: number;
  boothId: number;
  onUpdated: () => void;
}

const useUpdateCompletedFee = ({ staffId, boothId, onUpdated }: UseUpdateCompletedFeeOptions) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ sessionId, fee }: { sessionId: number; fee: number }) =>
      updateCompletedFee(boothId, sessionId, fee),
    retry: false,
    networkMode: "always",
    onSuccess: onUpdated,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: boothValetSessionsQueryKey(staffId, boothId) }),
  });

  return {
    update: (sessionId: number, fee: number) => mutation.mutate({ sessionId, fee }),
    isUpdating: mutation.isPending,
    errorMessage: mutation.error ? getErrorMessage(mutation.error, UPDATE_ERROR_MESSAGE) : null,
    resetError: mutation.reset,
  };
};

export { useUpdateCompletedFee };
