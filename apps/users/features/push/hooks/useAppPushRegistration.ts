import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";

import { askAppForPushToken, onAppPushToken } from "@/features/auth/appBridge";
import { registerPushDevice } from "@/features/push/apis/pushDevices";
import { saveRegisteredPushToken } from "@/features/push/registeredPushToken";

const useAppPushRegistration = (enabled: boolean) => {
  const { mutate: register } = useMutation({
    mutationFn: registerPushDevice,
    onSuccess: (_, { token }) => saveRegisteredPushToken(token),
  });

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = onAppPushToken(register);
    askAppForPushToken();

    return unsubscribe;
  }, [enabled, register]);
};

export { useAppPushRegistration };
