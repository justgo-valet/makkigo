import { z } from "zod";

const MAX_BOOTH_PHOTOS = 5;
const MAX_BOOTH_PHOTO_BYTES = 5 * 1024 * 1024;
const BOOTH_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const boothPhotoMimeTypeSchema = z.enum(BOOTH_PHOTO_MIME_TYPES);
const boothPhotoUploadMetadataSchema = z.object({
  uploadId: z.string().uuid(),
  contentType: boothPhotoMimeTypeSchema,
  size: z.number().int().min(1).max(MAX_BOOTH_PHOTO_BYTES),
}).strict();
const boothPhotoPresignRequestSchema = z.object({
  uploads: z.array(z.object({
    contentType: boothPhotoMimeTypeSchema,
    size: z.number().int().min(1).max(MAX_BOOTH_PHOTO_BYTES),
  }).strict()).min(1).max(MAX_BOOTH_PHOTOS),
}).strict();

export {
  BOOTH_PHOTO_MIME_TYPES,
  MAX_BOOTH_PHOTO_BYTES,
  MAX_BOOTH_PHOTOS,
  boothPhotoMimeTypeSchema,
  boothPhotoPresignRequestSchema,
  boothPhotoUploadMetadataSchema,
};
export type BoothPhotoUploadMetadata = z.infer<typeof boothPhotoUploadMetadataSchema>;
