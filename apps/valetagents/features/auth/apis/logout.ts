import { apiClient } from "@/libs/common/api/apiClient";
import { pushDeviceCleanupRequestSchema } from "@/libs/push/contracts/pushDevices";

import type { PushDeviceCleanupRequest } from "@/libs/push/contracts/pushDevices";

const logout = async (request: PushDeviceCleanupRequest) => {
  await apiClient.post("auth/logout", { json: pushDeviceCleanupRequestSchema.parse(request) });
};

export { logout };
