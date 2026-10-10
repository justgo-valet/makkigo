import { apiClient } from "@/libs/common/api/apiClient";
import { merchantsResponseSchema } from "@/libs/merchant/contracts/merchants";

import type { MerchantsResponse } from "@/libs/merchant/contracts/merchants";

const searchMerchants = async (query: string): Promise<MerchantsResponse> => {
  const response = await apiClient.get("merchants", { searchParams: { q: query } }).json<unknown>();

  const parsedResponse = merchantsResponseSchema.safeParse(response);
  if (!parsedResponse.success) {
    throw new Error("유효하지 않은 응답입니다.");
  }
  return parsedResponse.data;
};

export { searchMerchants };
