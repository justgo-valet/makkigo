import { apiClient } from "@/libs/common/api/apiClient";

import { parseBoothSearchResponse } from "../schemas/onboarding";

import type { BoothSearchItem } from "../schemas/onboarding";

const searchBooths = async (query: string, signal?: AbortSignal): Promise<BoothSearchItem[]> => {
  const response = await apiClient
    .get("booths", { searchParams: { q: query }, signal })
    .json<unknown>();

  return parseBoothSearchResponse(response).items;
};

export { searchBooths };
