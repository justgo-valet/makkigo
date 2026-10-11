import { apiClient } from "@/libs/common/api/apiClient";
import { delayArrivalRequestSchema } from "@/libs/valet/contracts/arrival";

import type { DelayArrivalRequest } from "@/libs/valet/contracts/arrival";

const delayArrival = async (valetSessionId: number, request: DelayArrivalRequest) => {
  await apiClient.post(`valet-sessions/${valetSessionId}/delay`, {
    json: delayArrivalRequestSchema.parse(request),
  });
};

export { delayArrival };
