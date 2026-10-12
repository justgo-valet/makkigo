import { z } from "zod";

const MERCHANT_BOOTH_SEARCH_RESULT_LIMIT = 20;

const merchantBoothSearchQuerySchema = z.string().trim().min(1).max(50);
const merchantBoothSearchItemSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string(),
    address: z.string(),
  })
  .strict();
const merchantBoothSearchResponseSchema = z
  .object({ items: z.array(merchantBoothSearchItemSchema).max(MERCHANT_BOOTH_SEARCH_RESULT_LIMIT) })
  .strict();

export {
  MERCHANT_BOOTH_SEARCH_RESULT_LIMIT,
  merchantBoothSearchItemSchema,
  merchantBoothSearchQuerySchema,
  merchantBoothSearchResponseSchema,
};
export type MerchantBoothSearchItem = z.infer<typeof merchantBoothSearchItemSchema>;
export type MerchantBoothSearchResponse = z.infer<typeof merchantBoothSearchResponseSchema>;
