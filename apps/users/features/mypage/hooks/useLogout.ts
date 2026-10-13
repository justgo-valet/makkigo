import { getErrorMessage } from "@makkigo/api-client";
import { useMutation } from "@tanstack/react-query";

import { logout } from "@/features/auth/apis/logout";
import { useRemoveAppPushDevice } from "@/features/push/hooks/useRemoveAppPushDevice";

const LOGIN_PATH = "/login";
const FALLBACK_ERROR_MESSAGE = "로그아웃하지 못했습니다. 다시 시도해주세요.";

const useLogout = () => {
  const { mutateAsync: removeAppPushDevice } = useRemoveAppPushDevice();
  const { mutate, isPending, error } = useMutation({
    mutationFn: async () => {
      await removeAppPushDevice().catch((removeError: unknown) => {
        console.error("Failed to remove push device on logout", removeError);
      });
      await logout();
    },
    onSuccess: () => window.location.replace(LOGIN_PATH),
  });

  return {
    logout: () => {
      if (!isPending) mutate();
    },
    isLoggingOut: isPending,
    errorMessage: error ? getErrorMessage(error, FALLBACK_ERROR_MESSAGE) : null,
  };
};

export { useLogout };
