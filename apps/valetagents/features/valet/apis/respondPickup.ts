import { apiClient } from "@/libs/common/api/apiClient";

import type { PickupResponseRequest } from "@/libs/valet/contracts/pickup-response";

const respondPickup = async (
  boothId: number,
  sessionId: number,
  body: PickupResponseRequest,
): Promise<void> => {
  await apiClient.post(`booths/${boothId}/valet-sessions/${sessionId}/pickup-response`, {
    json: body,
  });
};

export { respondPickup };
