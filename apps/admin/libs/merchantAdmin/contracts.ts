import { z } from "zod";

const merchantAdminCreateBodySchema = z
  .object({
    loginId: z.string().max(100),
    name: z.string().trim().min(1).max(50),
    merchantId: z.number().int().positive().nullable(),
  })
  .strict();

const merchantAdminLinkBodySchema = z.object({ merchantId: z.number().int().positive().nullable() }).strict();

export { merchantAdminCreateBodySchema, merchantAdminLinkBodySchema };
export type MerchantAdminCreateBody = z.infer<typeof merchantAdminCreateBodySchema>;
