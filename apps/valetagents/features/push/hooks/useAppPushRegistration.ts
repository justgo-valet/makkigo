import { useEffect, useState } from "react";

import {
  askAppForPushToken,
  isInApp,
  onAppPushToken,
  type AppPushState,
} from "@/features/auth/appBridge";
import { registerPushDevice, removePushDevice } from "@/features/push/apis/pushDevices";
import { createPushDeviceSync } from "@/features/push/pushDeviceSync";
import {
  readRegisteredPushDevice,
  saveRegisteredPushDevice,
} from "@/features/push/registeredPushDevice";
import {
  isStaffPushSyncAllowed,
  trackStaffPushSync,
} from "@/features/push/pushSyncCoordinator";
import { readPushInstallationSecret } from "@/features/push/installationSecret";

type PushAvailability = "ready" | "denied" | "unavailable";

const useAppPushRegistration = (staffId: number, requestPermission: boolean) => {
  const [availability, setAvailability] = useState<PushAvailability>("ready");

  useEffect(() => {
    const synchronizer = createPushDeviceSync(staffId, {
      read: readRegisteredPushDevice,
      save: saveRegisteredPushDevice,
      register: registerPushDevice,
      remove: (hasPushDevice) => removePushDevice({
        hasPushDevice,
        installationSecret: readPushInstallationSecret() ?? undefined,
      }),
    });
    if (!isInApp()) return () => synchronizer.stop();
    const unsubscribe = onAppPushToken(({
      pushToken,
      isPermissionDenied,
      isUnavailable,
    }: AppPushState) => {
      setAvailability(isPermissionDenied ? "denied" : isUnavailable ? "unavailable" : "ready");
      if (!isStaffPushSyncAllowed(staffId)) return;
      if (!pushToken && !isPermissionDenied) return;
      const task = synchronizer.sync(pushToken).catch((error: unknown) => {
        console.error("Failed to synchronize staff push device", error);
        setAvailability("unavailable");
      });
      trackStaffPushSync(staffId, task);
    });

    if (requestPermission) askAppForPushToken();
    return () => {
      unsubscribe();
      synchronizer.stop();
    };
  }, [requestPermission, staffId]);

  return availability;
};

export { useAppPushRegistration };
