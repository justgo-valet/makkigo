import { apiClient } from "@/libs/common/api/apiClient";
import { merchantDetailSchema } from "@/libs/merchant/contracts/merchantDetail";

import type { MerchantDetail } from "@/libs/merchant/contracts/merchantDetail";

const getMerchantDetail = async (merchantId: number): Promise<MerchantDetail> => {
  const response = await apiClient.get(`merchants/${merchantId}`).json<unknown>();

  const parsedResponse = merchantDetailSchema.safeParse(response);
  if (!parsedResponse.success) {
    throw new Error("유효하지 않은 응답입니다.");
  }
  return parsedResponse.data;
};

export { getMerchantDetail };
