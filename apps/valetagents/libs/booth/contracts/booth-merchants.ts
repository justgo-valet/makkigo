import { z } from "zod";

const BOOTH_MERCHANT_PAGE_SIZE = 5;

const boothMerchantPageSchema = z.coerce.number().int().positive();

const boothMerchantSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  address: z.string(),
  addressDetail: z.string().nullable(),
  photoUrls: z.array(z.string().url()),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  updatedAt: z.string().datetime(),
});

const boothMerchantListResponseSchema = z.object({
  items: z.array(boothMerchantSchema),
  page: z.number().int().positive(),
  totalPages: z.number().int().positive(),
});

const boothMerchantReviewBodySchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    merchants: z
      .array(z.object({ id: z.number().int().positive(), updatedAt: z.string().datetime() }).strict())
      .min(1)
      .max(BOOTH_MERCHANT_PAGE_SIZE)
      .refine((merchants) => new Set(merchants.map(({ id }) => id)).size === merchants.length),
  })
  .strict();

export {
  BOOTH_MERCHANT_PAGE_SIZE,
  boothMerchantListResponseSchema,
  boothMerchantPageSchema,
  boothMerchantReviewBodySchema,
  boothMerchantSchema,
};
export type BoothMerchant = z.infer<typeof boothMerchantSchema>;
export type BoothMerchantListResponse = z.infer<typeof boothMerchantListResponseSchema>;
export type BoothMerchantReviewBody = z.infer<typeof boothMerchantReviewBodySchema>;
