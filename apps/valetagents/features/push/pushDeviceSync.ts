import type { AppPushToken } from "@/features/auth/appBridge";
import type { RegisteredPushDevice } from "./registeredPushDevice";

interface PushDeviceSyncDependencies {
  read: () => RegisteredPushDevice | null;
  save: (device: RegisteredPushDevice | null) => void;
  register: (request: AppPushToken) => Promise<void>;
  remove: (hasPushDevice: boolean) => Promise<void>;
}

const createPushDeviceSync = (staffId: number, dependencies: PushDeviceSyncDependencies) => {
  let active = true;
  let queue = Promise.resolve();

  const run = async (pushToken: AppPushToken | null) => {
    if (!active) return;
    const registered = dependencies.read();
    if (!pushToken) {
      await dependencies.remove(registered !== null);
      dependencies.save(null);
      return;
    }

    await dependencies.register(pushToken);
    // Once the request committed, retain its cleanup marker even if the owner
    // component unmounted while the response was in flight.
    dependencies.save({ staffId });
  };

  return {
    sync: (pushToken: AppPushToken | null) => {
      const next = queue.catch(() => undefined).then(() => run(pushToken));
      queue = next;
      return next;
    },
    stop: () => { active = false; },
  };
};

export { createPushDeviceSync };
export type { PushDeviceSyncDependencies };
