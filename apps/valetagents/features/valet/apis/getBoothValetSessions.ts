import { apiClient } from "@/libs/common/api/apiClient";

import { parseBoothValetSessionListResponse } from "../schemas/sessions";

import type { BoothValetSessionListResponse } from "../schemas/sessions";

const getBoothValetSessions = async (
  boothId: number,
  signal?: AbortSignal,
): Promise<BoothValetSessionListResponse> => {
  const response = await apiClient
    .get(`booths/${boothId}/valet-sessions`, { signal })
    .json<unknown>();

  return parseBoothValetSessionListResponse(response);
};

export { getBoothValetSessions };
