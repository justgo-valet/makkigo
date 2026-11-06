import { apiClient } from "@/libs/common/api/apiClient";

import { parseValetSessionListResponse } from "../schemas/sessions";

import type { ValetSessionListResponse } from "../schemas/sessions";

const getMerchantValetSessions = async (signal?: AbortSignal): Promise<ValetSessionListResponse> => {
  const response = await apiClient.get("merchants/me/valet-sessions", { signal }).json<unknown>();

  return parseValetSessionListResponse(response);
};

export { getMerchantValetSessions };
