import { getErrorMessage } from "@makkigo/api-client";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { saveRegisteredPushToken } from "@/features/push/registeredPushToken";
import { getWithdrawErrorCode, withdraw } from "@/features/user/apis/withdraw";

import type { WithdrawErrorCode } from "@/libs/user/contracts/withdraw";

const LOGIN_PATH = "/login";
const FALLBACK_ERROR_MESSAGE = "회원 탈퇴를 처리하지 못했습니다. 다시 시도해주세요.";
const ERROR_MESSAGES: Record<WithdrawErrorCode, string> = {
  ACTIVE_VALET_SESSION:
    "진행 중인 발렛이 있어 탈퇴할 수 없어요. 도착 알림은 취소하고, 맡긴 차는 출차가 끝난 뒤 다시 시도해 주세요.",
};

const getWithdrawErrorMessage = (error: Error) => {
  const code = getWithdrawErrorCode(error);

  return code ? ERROR_MESSAGES[code] : getErrorMessage(error, FALLBACK_ERROR_MESSAGE);
};

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
    errorMessage: error ? getWithdrawErrorMessage(error) : null,
    open,
    close,
    confirm: () => {
      if (!isPending) mutate();
    },
  };
};

export { useWithdraw };
