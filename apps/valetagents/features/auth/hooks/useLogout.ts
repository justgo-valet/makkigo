import { getErrorMessage } from "@makkigo/api-client";
import { useState } from "react";

import { logout } from "@/features/auth/apis/logout";
import { setAppAuthenticated } from "@/features/auth/appBridge";
import { readPushInstallationSecret } from "@/features/push/installationSecret";
import {
  readRegisteredPushDevice,
  saveRegisteredPushDevice,
} from "@/features/push/registeredPushDevice";
import { beginStaffLogout, cancelStaffLogout } from "@/features/push/pushSyncCoordinator";
import { cleanupActiveQuerySession } from "@/libs/common/query/querySession";

const LOGIN_PATH = "/login";
const FALLBACK_ERROR_MESSAGE = "로그아웃하지 못했습니다. 다시 시도해주세요.";

const useLogout = (staffId: number) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const performLogout = async () => {
    setIsLoggingOut(true);
    setErrorMessage(null);
    setAppAuthenticated(false);
    try {
      await beginStaffLogout(staffId);
      await logout({
        hasPushDevice: readRegisteredPushDevice() !== null,
        installationSecret: readPushInstallationSecret() ?? undefined,
      });
      saveRegisteredPushDevice(null);
      await cleanupActiveQuerySession();
      window.location.replace(LOGIN_PATH);
    } catch (error) {
      cancelStaffLogout(staffId);
      setAppAuthenticated(true);
      setErrorMessage(getErrorMessage(error, FALLBACK_ERROR_MESSAGE));
      setIsLoggingOut(false);
    }
  };

  return {
    logout: () => !isLoggingOut && void performLogout(),
    isLoggingOut,
    errorMessage,
  };
};

export { useLogout };
