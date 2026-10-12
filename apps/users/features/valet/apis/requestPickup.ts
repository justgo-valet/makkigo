import { apiClient } from "@/libs/common/api/apiClient";
import { pickupRequestResponseSchema } from "@/libs/valet/contracts/pickupRequest";

import type { PickupRequestResponse } from "@/libs/valet/contracts/pickupRequest";

const requestPickup = async (valetSessionId: number): Promise<PickupRequestResponse> =>
  pickupRequestResponseSchema.parse(
    await apiClient.post(`valet-sessions/${valetSessionId}/pickup-request`).json(),
  );

export { requestPickup };
