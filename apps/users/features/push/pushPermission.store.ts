import { create } from "zustand";

interface PushPermissionState {
  isNotificationOff: boolean;
  setNotificationOff: (isNotificationOff: boolean) => void;
}

const usePushPermission = create<PushPermissionState>()((set) => ({
  isNotificationOff: false,
  setNotificationOff: (isNotificationOff) => set({ isNotificationOff }),
}));

export { usePushPermission };
