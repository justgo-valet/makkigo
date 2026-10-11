import { apiClient } from "@/libs/common/api/apiClient";
import {
  pushDeviceRequestSchema,
  removePushDeviceRequestSchema,
  type PushDeviceRequest,
  type RemovePushDeviceRequest,
} from "@/libs/push/contracts/pushDevices";

const registerPushDevice = async (request: PushDeviceRequest) => {
  await apiClient.post("push-devices", { json: pushDeviceRequestSchema.parse(request) });
};

const removePushDevice = async (request: RemovePushDeviceRequest) => {
  await apiClient.delete("push-devices", { json: removePushDeviceRequestSchema.parse(request) });
};

export { registerPushDevice, removePushDevice };
