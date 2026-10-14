"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { setNotifications } from "../apis/setNotifications";

const TOGGLE_ERROR_MESSAGE = "알림 설정을 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.";

interface UseNotificationToggleOptions {
  boothId: number;
  initialEnabled: boolean;
}

const useNotificationToggle = ({ boothId, initialEnabled }: UseNotificationToggleOptions) => {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [open, setOpen] = useState(false);
  const [sheetEnabled, setSheetEnabled] = useState(initialEnabled);
  const mutation = useMutation({
    mutationFn: (next: boolean) => setNotifications(boothId, next),
    retry: false,
    networkMode: "always",
    onSuccess: (_result, next) => {
      setEnabled(next);
      setOpen(false);
    },
  });

  return {
    enabled,
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
