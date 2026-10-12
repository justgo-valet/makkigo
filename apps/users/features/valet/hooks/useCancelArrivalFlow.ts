import { getErrorMessage } from "@makkigo/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { cancelArrival } from "@/features/valet/apis/cancelArrival";
import { CURRENT_VALET_SESSION_QUERY_KEY } from "@/features/valet/hooks/useCurrentValetSession";

const FALLBACK_ERROR_MESSAGE = "도착 알림을 취소하지 못했습니다. 다시 시도해주세요.";

const useCancelArrivalFlow = (valetSessionId: number | null) => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: cancelArrival,
    onSuccess: () => setIsOpen(false),
    onSettled: () => queryClient.invalidateQueries({ queryKey: CURRENT_VALET_SESSION_QUERY_KEY }),
  });

  const open = () => {
    reset();
    setIsOpen(true);
  };

  const close = () => {
    if (isPending) return;
    setIsOpen(false);
  };

  const confirm = () => {
    if (valetSessionId === null || isPending) return;
    mutate(valetSessionId);
  };

  return {
    isOpen,
    isCancelling: isPending,
    errorMessage: error && getErrorMessage(error, FALLBACK_ERROR_MESSAGE),
    open,
    close,
    confirm,
  };
};

export { useCancelArrivalFlow };
