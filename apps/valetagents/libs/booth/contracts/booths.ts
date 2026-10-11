import { z } from "zod";

const BOOTH_SEARCH_QUERY_MAX_LENGTH = 50;
const BOOTH_SEARCH_RESULT_LIMIT = 20;

const feePolicySchema = z.object({
  baseMinutes: z.number().int(),
  baseFee: z.number().int(),
  extraUnitMinutes: z.number().int(),
  extraUnitFee: z.number().int(),
  effectiveFrom: z.string().datetime(),
});

const boothSummarySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  address: z.string(),
  addressDetail: z.string().nullable(),
});

const selectedBoothSchema = boothSummarySchema.extend({ feePolicy: feePolicySchema.nullable() });

const boothSearchQuerySchema = z.string().trim().min(1).max(BOOTH_SEARCH_QUERY_MAX_LENGTH);

export {
  BOOTH_SEARCH_QUERY_MAX_LENGTH,
  BOOTH_SEARCH_RESULT_LIMIT,
  boothSearchQuerySchema,
  boothSummarySchema,
  feePolicySchema,
  selectedBoothSchema,
};
export type FeePolicy = z.infer<typeof feePolicySchema>;
export type BoothSummary = z.infer<typeof boothSummarySchema>;
export type SelectedBooth = z.infer<typeof selectedBoothSchema>;
