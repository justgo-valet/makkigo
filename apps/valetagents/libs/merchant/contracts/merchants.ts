import { z } from "zod";

const merchantContractStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
const ownedMerchantSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string(),
    address: z.string(),
    addressDetail: z.string().nullable(),
    postalCode: z.string().nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    photoUrls: z.array(z.string().url()),
    booths: z.array(
      z
        .object({
          id: z.number().int().positive(),
          name: z.string(),
          address: z.string(),
          status: merchantContractStatusSchema,
        })
        .strict(),
    ),
  })
  .strict();
const ownedMerchantListResponseSchema = z.object({ items: z.array(ownedMerchantSchema) }).strict();

export { merchantContractStatusSchema, ownedMerchantListResponseSchema, ownedMerchantSchema };
export type MerchantContractStatus = z.infer<typeof merchantContractStatusSchema>;
export type OwnedMerchant = z.infer<typeof ownedMerchantSchema>;
export type OwnedMerchantListResponse = z.infer<typeof ownedMerchantListResponseSchema>;
