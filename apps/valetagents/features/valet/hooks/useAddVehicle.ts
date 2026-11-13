"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { addVehicle } from "../apis/addVehicle";
import { boothValetSessionsQueryKey } from "./useBoothValetSessions";

import type { AddVehicleInput } from "../apis/addVehicle";

const ADD_ERROR_MESSAGE = "차량을 추가하지 못했어요. 잠시 후 다시 시도해 주세요.";

interface UseAddVehicleOptions {
  staffId: number;
  boothId: number;
  onAdded: () => void;
}

const useAddVehicle = ({ staffId, boothId, onAdded }: UseAddVehicleOptions) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: AddVehicleInput) => addVehicle(boothId, input),
    retry: false,
    networkMode: "always",
    onSuccess: onAdded,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: boothValetSessionsQueryKey(staffId, boothId) }),
  });

  return {
    add: (input: AddVehicleInput) => mutation.mutate(input),
    isAdding: mutation.isPending,
    errorMessage: mutation.error ? getErrorMessage(mutation.error, ADD_ERROR_MESSAGE) : null,
    resetError: mutation.reset,
  };
};

export { useAddVehicle };
