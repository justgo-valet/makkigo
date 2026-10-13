import { z } from "zod";

const MAX_MERCHANT_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_MERCHANT_IMAGES = 5;

const merchantImageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
const merchantImageUploadStates = [
  "RESERVED",
  "READY",
  "CLAIMED",
  "COPYING",
  "VALIDATED",
  "ATTACHED",
  "REVOKED",
  "TOMBSTONED",
] as const;

const merchantImageMimeTypeSchema = z.enum(merchantImageMimeTypes);
const merchantImageUploadStateSchema = z.enum(merchantImageUploadStates);
const merchantImageReservationBodySchema = z
  .object({
    sessionId: z.string().uuid(),
    uploadId: z.string().uuid().optional(),
    contentType: merchantImageMimeTypeSchema,
    size: z.number().int().min(1).max(MAX_MERCHANT_IMAGE_BYTES),
  })
  .strict();

export {
  MAX_MERCHANT_IMAGE_BYTES,
  MAX_MERCHANT_IMAGES,
  merchantImageMimeTypeSchema,
  merchantImageMimeTypes,
  merchantImageReservationBodySchema,
  merchantImageUploadStateSchema,
  merchantImageUploadStates,
};
export type MerchantImageMimeType = z.infer<typeof merchantImageMimeTypeSchema>;
export type MerchantImageReservationBody = z.infer<typeof merchantImageReservationBodySchema>;
export type MerchantImageUploadState = z.infer<typeof merchantImageUploadStateSchema>;
