import { apiClient } from "@/libs/common/api/apiClient";
import { currentValetSessionResponseSchema } from "@/libs/valet/contracts/currentSession";

import type { CurrentValetSessionResponse } from "@/libs/valet/contracts/currentSession";

const getCurrentValetSession = async (): Promise<CurrentValetSessionResponse> =>
  currentValetSessionResponseSchema.parse(await apiClient.get("valet-sessions/current").json());

export { getCurrentValetSession };
