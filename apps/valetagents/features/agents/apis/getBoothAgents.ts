import { apiClient } from "@/libs/common/api/apiClient";

import { parseBoothAgentListResponse } from "../schemas/agents";

import type { BoothAgentListResponse } from "../schemas/agents";

const getBoothAgents = async (
  boothId: number,
  page: number,
  signal?: AbortSignal,
): Promise<BoothAgentListResponse> => {
  const response = await apiClient
    .get(`booths/${boothId}/agents`, { searchParams: { page }, signal })
    .json<unknown>();

  return parseBoothAgentListResponse(response);
};

export { getBoothAgents };
