"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { parkValetSession } from "../apis/parkValetSession";
import { boothValetSessionsQueryKey } from "./useBoothValetSessions";

const PARK_ERROR_MESSAGE = "주차 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";

interface UseParkValetSessionOptions {
  staffId: number;
  boothId: number;
  onParked: () => void;
}

const useParkValetSession = ({ staffId, boothId, onParked }: UseParkValetSessionOptions) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (sessionId: number) => parkValetSession(boothId, sessionId),
    retry: false,
    networkMode: "always",
    onSuccess: onParked,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: boothValetSessionsQueryKey(staffId, boothId) }),
  });

  return {
    park: (sessionId: number) => mutation.mutate(sessionId),
    isParking: mutation.isPending,
    errorMessage: mutation.error ? getErrorMessage(mutation.error, PARK_ERROR_MESSAGE) : null,
    resetError: mutation.reset,
  };
};

export { useParkValetSession };
