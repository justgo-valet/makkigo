import { isHTTPError } from "ky";

import { apiClient } from "@/libs/common/api/apiClient";
import { boothRequestErrorResponseSchema } from "@/libs/merchant/contracts/booth-request";

import type { BoothRequestErrorCode } from "@/libs/merchant/contracts/booth-request";

const requestMerchantBooth = async (merchantId: number, boothId: number) => {
  await apiClient.put(`merchants/${merchantId}/booths/${boothId}`);
};

const getBoothRequestErrorCode = (error: unknown): BoothRequestErrorCode | null => {
  if (!isHTTPError(error)) return null;

  const body = boothRequestErrorResponseSchema.safeParse(error.data);

  return body.success ? body.data.code : null;
};

export { getBoothRequestErrorCode, requestMerchantBooth };
