import { z } from "zod";

const merchantAccountRequestBodySchema = z
  .object({
    merchantId: z.number().int().positive().nullable(),
    merchantName: z.string().trim().max(100),
    merchantAddress: z.string().trim().max(200),
    requesterName: z.string().trim().min(1).max(50),
    requesterPhone: z
      .string()
      .transform((value) => value.replace(/\D/g, ""))
      .pipe(z.string().regex(/^0\d{8,10}$/)),
    privacyConsent: z.literal(true),
  })
  .strict()
  .refine((body) => body.merchantId !== null || (body.merchantName.length > 0 && body.merchantAddress.length > 0));

export { merchantAccountRequestBodySchema };
export type MerchantAccountRequestBody = z.input<typeof merchantAccountRequestBodySchema>;
