import { getErrorMessage } from "@makkigo/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { cancelArrival } from "@/features/valet/apis/cancelArrival";
import {
  CURRENT_SESSION_QUERY_KEY,
  useCurrentSession,
} from "@/features/valet/hooks/useCurrentSession";

const FALLBACK_ERROR_MESSAGE = "도착 알림을 취소하지 못했습니다. 다시 시도해주세요.";

const useCancelArrivalFlow = () => {
  const queryClient = useQueryClient();
  const { data } = useCurrentSession();
  const [isOpen, setIsOpen] = useState(false);
  const session = data?.session ?? null;
  const arrivingSessionId = session?.status === "ARRIVING" ? session.id : null;

  const mutation = useMutation({
    mutationFn: cancelArrival,
    onSuccess: () => setIsOpen(false),
    onSettled: () => queryClient.invalidateQueries({ queryKey: CURRENT_SESSION_QUERY_KEY }),
  });

  const open = () => {
    mutation.reset();
    setIsOpen(true);
  };

  const close = () => {
    if (mutation.isPending) return;
    setIsOpen(false);
  };

  const confirm = () => {
    if (arrivingSessionId === null || mutation.isPending) return;
    mutation.mutate(arrivingSessionId);
  };

  return {
    isOpen,
    isCancelling: mutation.isPending,
    errorMessage: mutation.isError ? getErrorMessage(mutation.error, FALLBACK_ERROR_MESSAGE) : null,
    open,
    close,
    confirm,
  };
};

export { useCancelArrivalFlow };
