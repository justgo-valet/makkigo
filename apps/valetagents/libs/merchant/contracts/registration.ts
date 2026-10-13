import { z } from "zod";

import { MAX_MERCHANT_IMAGES } from "./image-upload";

const normalizedOptionalAddressDetailSchema = z
  .string()
  .trim()
  .max(100)
  .nullish()
  .transform((value) => value || null);

const merchantRegistrationBodySchema = z
  .object({
    sessionId: z.string().uuid(),
    name: z.string().trim().min(1).max(100),
    roadAddress: z.string().trim().min(1),
    addressDetail: normalizedOptionalAddressDetailSchema,
    postalCode: z.string().regex(/^\d{5}$/),
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    boothId: z.number().int().positive(),
    uploadIds: z
      .array(z.string().uuid())
      .min(1)
      .max(MAX_MERCHANT_IMAGES)
      .refine((ids) => new Set(ids).size === ids.length, { message: "Upload IDs must be unique" }),
  })
  .strict();

export { merchantRegistrationBodySchema, normalizedOptionalAddressDetailSchema };
export type MerchantRegistrationBody = z.infer<typeof merchantRegistrationBodySchema>;
