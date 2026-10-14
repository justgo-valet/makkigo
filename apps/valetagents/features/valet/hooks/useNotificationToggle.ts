"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { setNotifications } from "../apis/setNotifications";
import { boothValetSessionsQueryKey } from "./useBoothValetSessions";

import type { BoothValetSessionListResponse } from "../schemas/sessions";

const TOGGLE_ERROR_MESSAGE = "알림 설정을 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.";

interface UseNotificationToggleOptions {
  staffId: number;
  boothId: number;
  enabled: boolean;
}

const useNotificationToggle = ({ staffId, boothId, enabled }: UseNotificationToggleOptions) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sheetEnabled, setSheetEnabled] = useState(enabled);
  const mutation = useMutation({
    mutationFn: (next: boolean) => setNotifications(boothId, next),
    retry: false,
    networkMode: "always",
    onSuccess: async (_result, next) => {
      await queryClient.cancelQueries({ queryKey: boothValetSessionsQueryKey(staffId, boothId) });
      queryClient.setQueryData<BoothValetSessionListResponse>(
        boothValetSessionsQueryKey(staffId, boothId),
        (data) => data && { ...data, notificationsEnabled: next },
      );
      setOpen(false);
    },
  });

  return {
    sheetEnabled,
    open,
    openSheet: () => {
      mutation.reset();
      setSheetEnabled(enabled);
      setOpen(true);
    },
    close: () => !mutation.isPending && setOpen(false),
    confirm: () => mutation.mutate(!sheetEnabled),
    isPending: mutation.isPending,
    errorMessage: mutation.error ? getErrorMessage(mutation.error, TOGGLE_ERROR_MESSAGE) : null,
  };
};

export { useNotificationToggle };
