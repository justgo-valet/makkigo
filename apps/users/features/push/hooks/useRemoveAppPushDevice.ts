import { useMutation } from "@tanstack/react-query";

import { removePushDevice } from "@/features/push/apis/pushDevices";
import {
  readRegisteredPushToken,
  saveRegisteredPushToken,
} from "@/features/push/registeredPushToken";

const removeRegisteredPushDevice = async () => {
  const token = readRegisteredPushToken();

  if (!token) return;

  await removePushDevice({ token });
  saveRegisteredPushToken(null);
};

const useRemoveAppPushDevice = () => useMutation({ mutationFn: removeRegisteredPushDevice });

export { useRemoveAppPushDevice };
