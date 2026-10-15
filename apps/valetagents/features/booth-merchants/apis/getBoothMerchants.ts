import { apiClient } from "@/libs/common/api/apiClient";

import { parseBoothMerchantListResponse } from "../schemas/merchants";

import type { BoothMerchantListResponse } from "../schemas/merchants";

const getBoothMerchants = async (
  boothId: number,
  page: number,
  signal?: AbortSignal,
): Promise<BoothMerchantListResponse> => {
  const response = await apiClient
    .get(`booths/${boothId}/merchants`, { searchParams: { page }, signal })
    .json<unknown>();

  return parseBoothMerchantListResponse(response);
};

export { getBoothMerchants };
