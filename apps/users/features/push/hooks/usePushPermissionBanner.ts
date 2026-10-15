import { openAppNotificationSettings } from "@/features/auth/appBridge";
import { usePushPermission } from "@/features/push/pushPermission.store";

const usePushPermissionBanner = () => {
  const isVisible = usePushPermission((state) => state.isNotificationOff);

  return { isVisible, openSettings: openAppNotificationSettings };
};

export { usePushPermissionBanner };
