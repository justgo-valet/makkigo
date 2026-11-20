import { z } from "zod";

const MAX_MERCHANT_PHOTOS = 5;
const MAX_MERCHANT_PHOTO_BYTES = 5 * 1024 * 1024;
const merchantPhotoMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => value || null);

const merchantBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    address: z.string().trim().min(1).max(200),
    addressDetail: optionalText(100),
    postalCode: optionalText(5).refine((value) => value === null || /^\d{5}$/.test(value)),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    phone: optionalText(30),
    kakaoPlaceId: optionalText(30).refine((value) => value === null || /^\d+$/.test(value)),
  })
  .strict()
  .refine((body) => (body.latitude === null) === (body.longitude === null));

const merchantPhotoPresignBodySchema = z
  .object({
    contentType: z.enum(merchantPhotoMimeTypes),
    size: z.number().int().min(1).max(MAX_MERCHANT_PHOTO_BYTES),
  })
  .strict();

const merchantPhotoCompleteBodySchema = z
  .object({ key: z.string().regex(/^merchants\/staging\/[0-9a-f-]{36}\.(jpg|png|webp)$/) })
  .strict();

const merchantPhotoOrderBodySchema = z
  .object({ photoIds: z.array(z.number().int().positive()).max(MAX_MERCHANT_PHOTOS) })
  .strict();

interface KakaoPlace {
  kakaoPlaceId: string;
  name: string;
  address: string;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  phone: string | null;
  merchantId: number | null;
}

interface MerchantOption {
  id: number;
  name: string;
  address: string;
}

export {
  MAX_MERCHANT_PHOTO_BYTES,
  MAX_MERCHANT_PHOTOS,
  merchantBodySchema,
  merchantPhotoCompleteBodySchema,
  merchantPhotoMimeTypes,
  merchantPhotoOrderBodySchema,
  merchantPhotoPresignBodySchema,
};
export type MerchantBody = z.input<typeof merchantBodySchema>;
export type MerchantPhotoMimeType = (typeof merchantPhotoMimeTypes)[number];
export type { KakaoPlace, MerchantOption };
