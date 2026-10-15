import { apiClient } from "@/libs/common/api/apiClient";
import { currentSessionResponseSchema } from "@/libs/valet/contracts/currentSession";

import type { CurrentSessionResponse } from "@/libs/valet/contracts/currentSession";

const getCurrentSession = async (): Promise<CurrentSessionResponse> =>
  currentSessionResponseSchema.parse(await apiClient.get("valet-sessions/current").json());

export { getCurrentSession };
