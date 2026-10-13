import { apiClient } from "@/libs/common/api/apiClient";
import { merchantBoothSearchResponseSchema } from "@/libs/merchant/contracts/merchant-booths";

import type { MerchantBoothSearchItem } from "@/libs/merchant/contracts/merchant-booths";

const searchMerchantBooths = async (
  query: string,
  signal?: AbortSignal,
): Promise<MerchantBoothSearchItem[]> => {
  const response = await apiClient
    .get("merchant-booths", { searchParams: { query }, signal })
    .json<unknown>();

  return merchantBoothSearchResponseSchema.parse(response).items;
};

export { searchMerchantBooths };
