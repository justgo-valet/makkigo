import { z } from "zod";

const merchantIdSchema = z.coerce.number().int().positive();

const feePolicySchema = z.object({
  baseMinutes: z.number().int(),
  baseFee: z.number().int(),
  extraUnitMinutes: z.number().int(),
  extraUnitFee: z.number().int(),
});

const merchantDetailSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  address: z.string(),
  addressDetail: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  photoUrls: z.array(z.string()),
  booths: z.array(z.object({ id: z.number().int(), name: z.string(), feePolicy: feePolicySchema })),
});

type FeePolicy = z.infer<typeof feePolicySchema>;
type MerchantDetail = z.infer<typeof merchantDetailSchema>;

export { merchantDetailSchema, merchantIdSchema };
export type { FeePolicy, MerchantDetail };
