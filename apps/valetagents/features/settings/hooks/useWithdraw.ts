import { getErrorMessage } from "@makkigo/api-client";
import { useState } from "react";

import { getWithdrawErrorCode, withdraw } from "@/features/auth/apis/withdraw";
import { setAppAuthenticated } from "@/features/auth/appBridge";
import { saveRegisteredPushDevice } from "@/features/push/registeredPushDevice";
import { beginStaffLogout, cancelStaffLogout } from "@/features/push/pushSyncCoordinator";
import { cleanupActiveQuerySession } from "@/libs/common/query/querySession";

import type { WithdrawErrorCode } from "@/libs/auth/contracts/withdraw";

const LOGIN_PATH = "/login";
const FALLBACK_ERROR_MESSAGE = "탈퇴를 처리하지 못했습니다. 다시 시도해주세요.";
const ERROR_MESSAGES: Record<WithdrawErrorCode, string> = {
  ACTIVE_VALET_SESSION:
    "부스나 업체에 진행 중인 발렛이 있어 탈퇴할 수 없어요. 모든 차가 출차된 뒤 다시 시도해 주세요.",
};

const getWithdrawErrorMessage = (error: unknown) => {
  const code = getWithdrawErrorCode(error);

  return code ? ERROR_MESSAGES[code] : getErrorMessage(error, FALLBACK_ERROR_MESSAGE);
};

const useWithdraw = (staffId: number) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const performWithdraw = async () => {
    setIsWithdrawing(true);
    setErrorMessage(null);
    setAppAuthenticated(false);
    try {
      await beginStaffLogout(staffId);
      await withdraw();
    } catch (error) {
      cancelStaffLogout(staffId);
      setAppAuthenticated(true);
      setErrorMessage(getWithdrawErrorMessage(error));
      setIsWithdrawing(false);
      return;
    }
    saveRegisteredPushDevice(null);
    try {
      await cleanupActiveQuerySession();
    } finally {
      window.location.replace(LOGIN_PATH);
    }
  };

  return {
    isOpen,
    isWithdrawing,
    errorMessage,
    open: () => {
      setErrorMessage(null);
      setIsOpen(true);
    },
    close: () => {
      if (!isWithdrawing) setIsOpen(false);
    },
    confirm: () => {
      if (!isWithdrawing) void performWithdraw();
    },
  };
};

export { useWithdraw };
