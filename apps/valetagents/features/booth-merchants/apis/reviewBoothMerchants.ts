import { apiClient } from "@/libs/common/api/apiClient";

import type { BoothMerchantReviewBody } from "../schemas/merchants";

const reviewBoothMerchants = async (boothId: number, body: BoothMerchantReviewBody): Promise<void> => {
  await apiClient.patch(`booths/${boothId}/merchants`, { json: body });
};

export { reviewBoothMerchants };
