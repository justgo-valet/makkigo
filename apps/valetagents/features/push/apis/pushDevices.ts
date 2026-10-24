import { isHTTPError } from "ky";

import { apiClient } from "@/libs/common/api/apiClient";
import {
  pushDeviceCleanupRequestSchema,
  pushDeviceRequestSchema,
  type PushDeviceCleanupRequest,
  type PushDeviceRequest,
} from "@/libs/push/contracts/pushDevices";
import { requirePushInstallationSecret } from "@/features/push/installationSecret";

const registerPushDevice = async (request: Omit<PushDeviceRequest, "installationSecret">) => {
  const json = pushDeviceRequestSchema.parse({
    ...request,
    installationSecret: requirePushInstallationSecret(),
  });
  try {
    await apiClient.post("staff/push-devices", { json });
  } catch (error) {
    if (!isHTTPError(error) || error.response.status !== 428) throw error;
    await apiClient.post("staff/push-devices", { json });
  }
};

const removePushDevice = async (request: PushDeviceCleanupRequest) => {
  await apiClient.delete("staff/push-devices", {
    json: pushDeviceCleanupRequestSchema.parse(request),
  });
};

export { registerPushDevice, removePushDevice };
