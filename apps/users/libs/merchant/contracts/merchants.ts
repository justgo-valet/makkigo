import { z } from "zod";

const MERCHANT_SEARCH_QUERY_MAX_LENGTH = 50;

const merchantSchema = z.object({ id: z.number().int(), name: z.string(), address: z.string() });

const merchantsResponseSchema = z.array(merchantSchema);

type Merchant = z.infer<typeof merchantSchema>;
type MerchantsResponse = z.infer<typeof merchantsResponseSchema>;

export { MERCHANT_SEARCH_QUERY_MAX_LENGTH, merchantSchema, merchantsResponseSchema };
export type { Merchant, MerchantsResponse };
