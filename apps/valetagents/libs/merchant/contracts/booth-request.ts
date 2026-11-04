import { z } from "zod";

const BOOTH_REQUEST_ERROR_CODES = [
  "MERCHANT_ALREADY_APPROVED",
  "MERCHANT_NOT_FOUND",
  "BOOTH_NOT_FOUND",
  "ALREADY_REQUESTED",
] as const;

const boothRequestErrorResponseSchema = z.object({
  code: z.enum(BOOTH_REQUEST_ERROR_CODES),
});

type BoothRequestErrorCode = (typeof BOOTH_REQUEST_ERROR_CODES)[number];

export { boothRequestErrorResponseSchema };
export type { BoothRequestErrorCode };
