import { z } from "zod";

const BOOTH_MERCHANT_PAGE_SIZE = 5;

const boothMerchantPageSchema = z.coerce.number().int().positive();

const boothMerchantSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  address: z.string(),
  addressDetail: z.string().nullable(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  updatedAt: z.string().datetime(),
});

const boothMerchantListResponseSchema = z.object({
  items: z.array(boothMerchantSchema),
  page: z.number().int().positive(),
  totalPages: z.number().int().positive(),
});

export {
  BOOTH_MERCHANT_PAGE_SIZE,
  boothMerchantListResponseSchema,
  boothMerchantPageSchema,
  boothMerchantSchema,
};
export type BoothMerchant = z.infer<typeof boothMerchantSchema>;
export type BoothMerchantListResponse = z.infer<typeof boothMerchantListResponseSchema>;
