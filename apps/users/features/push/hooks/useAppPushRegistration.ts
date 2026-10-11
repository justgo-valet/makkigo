import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";

import { askAppForPushToken, onAppPushToken } from "@/features/auth/appBridge";
import { registerPushDevice } from "@/features/push/apis/pushDevices";
import { removeRegisteredPushDevice } from "@/features/push/hooks/useRemoveAppPushDevice";
import { saveRegisteredPushToken } from "@/features/push/registeredPushToken";

import type { AppPushToken } from "@/features/auth/appBridge";

const syncPushDevice = async (pushToken: AppPushToken | null) => {
  if (!pushToken) {
    await removeRegisteredPushDevice();
    return;
  }

  await registerPushDevice(pushToken);
  saveRegisteredPushToken(pushToken.token);
};

const useAppPushRegistration = (enabled: boolean) => {
  const { mutate: sync } = useMutation({ mutationFn: syncPushDevice });

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = onAppPushToken(sync);
    askAppForPushToken();

    return unsubscribe;
  }, [enabled, sync]);
};

export { useAppPushRegistration };
