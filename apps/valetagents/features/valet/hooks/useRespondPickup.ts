"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { respondPickup } from "../apis/respondPickup";
import { boothValetSessionsQueryKey } from "./useBoothValetSessions";

import type { PickupResponseRequest } from "@/libs/valet/contracts/pickup-response";

const RESPOND_ERROR_MESSAGE = "출차 응답을 보내지 못했어요. 잠시 후 다시 시도해 주세요.";

interface UseRespondPickupOptions {
  staffId: number;
  boothId: number;
  onResponded: () => void;
}

const useRespondPickup = ({ staffId, boothId, onResponded }: UseRespondPickupOptions) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ sessionId, body }: { sessionId: number; body: PickupResponseRequest }) =>
      respondPickup(boothId, sessionId, body),
    retry: false,
    networkMode: "always",
    onSuccess: onResponded,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: boothValetSessionsQueryKey(staffId, boothId) }),
  });

  return {
    respond: (sessionId: number, body: PickupResponseRequest) => mutation.mutate({ sessionId, body }),
    isResponding: mutation.isPending,
    errorMessage: mutation.error ? getErrorMessage(mutation.error, RESPOND_ERROR_MESSAGE) : null,
    resetError: mutation.reset,
  };
};

export { useRespondPickup };
