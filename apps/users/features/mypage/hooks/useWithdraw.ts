import { getErrorMessage } from "@makkigo/api-client";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { saveRegisteredPushToken } from "@/features/push/registeredPushToken";
import { withdraw } from "@/features/user/apis/withdraw";

const LOGIN_PATH = "/login";
const FALLBACK_ERROR_MESSAGE = "회원 탈퇴를 처리하지 못했습니다. 다시 시도해주세요.";

const useWithdraw = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: withdraw,
    onSuccess: () => {
      saveRegisteredPushToken(null);
      window.location.replace(LOGIN_PATH);
    },
  });

  const open = () => {
    reset();
    setIsOpen(true);
  };

  const close = () => {
    if (!isPending) setIsOpen(false);
  };

  return {
    isOpen,
    isWithdrawing: isPending,
    errorMessage: error ? getErrorMessage(error, FALLBACK_ERROR_MESSAGE) : null,
    open,
    close,
    confirm: () => {
      if (!isPending) mutate();
    },
  };
};

export { useWithdraw };
