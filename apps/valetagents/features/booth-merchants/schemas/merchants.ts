import { boothMerchantListResponseSchema } from "@/libs/booth/contracts/booth-merchants";

import type {
  BoothMerchant,
  BoothMerchantListResponse,
  BoothMerchantReviewBody,
} from "@/libs/booth/contracts/booth-merchants";

const parseBoothMerchantListResponse = (value: unknown): BoothMerchantListResponse => {
  const result = boothMerchantListResponseSchema.safeParse(value);
  if (!result.success) throw new Error("유효하지 않은 업체 목록 응답입니다.");
  return result.data;
};

export { parseBoothMerchantListResponse };
export type { BoothMerchant, BoothMerchantListResponse, BoothMerchantReviewBody };
