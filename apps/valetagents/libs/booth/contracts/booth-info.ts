import { z } from "zod";

import { boothInfoFieldsShape } from "./create-booth";
import { boothPhotoUploadMetadataSchema, MAX_BOOTH_PHOTOS } from "./photos";

const updateBoothInfoRequestSchema = z
  .object({
    ...boothInfoFieldsShape,
    keptPhotoIds: z.array(z.number().int().positive()).max(MAX_BOOTH_PHOTOS),
    photoUploads: z.array(boothPhotoUploadMetadataSchema).max(MAX_BOOTH_PHOTOS).optional().default([]),
  })
  .strict()
  .refine(
    ({ keptPhotoIds, photoUploads }) =>
      new Set(keptPhotoIds).size === keptPhotoIds.length &&
      keptPhotoIds.length + photoUploads.length <= MAX_BOOTH_PHOTOS,
  );

interface BoothInfo {
  name: string;
  address: string;
  addressDetail: string | null;
  photos: { id: number; url: string }[];
  updatedAt: string;
}

type UpdateBoothInfoInput = z.input<typeof updateBoothInfoRequestSchema>;
type UpdateBoothInfoRequest = z.infer<typeof updateBoothInfoRequestSchema>;

export { updateBoothInfoRequestSchema };
export type { BoothInfo, UpdateBoothInfoInput, UpdateBoothInfoRequest };
