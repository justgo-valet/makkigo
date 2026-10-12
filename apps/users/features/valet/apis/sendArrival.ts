import { apiClient } from "@/libs/common/api/apiClient";
import { sendArrivalResponseSchema } from "@/libs/valet/contracts/arrival";

import type { SendArrivalRequest, SendArrivalResponse } from "@/libs/valet/contracts/arrival";

const sendArrival = async (request: SendArrivalRequest): Promise<SendArrivalResponse> =>
  sendArrivalResponseSchema.parse(await apiClient.post("valet-sessions", { json: request }).json());

export { sendArrival };
