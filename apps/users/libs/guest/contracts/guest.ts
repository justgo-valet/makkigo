import { ticketDesignSchema } from "@makkigo/ticket-design";
import { z } from "zod";

import { currentSessionSchema } from "@/libs/valet/contracts/currentSession";

const PLATE_NUMBER_PATTERN = /^\d{2,3}[가-힣]\d{4}$/;

const normalizePlateNumber = (value: string) => value.replace(/[\s-]/g, "");

const guestMerchantIdSchema = z.coerce.number().int().positive();

const plateNumberSchema = z
  .string()
  .transform(normalizePlateNumber)
  .pipe(z.string().regex(PLATE_NUMBER_PATTERN));

const guestSessionRequestSchema = z.object({ plateNumber: plateNumberSchema }).strict();

const guestPickupRequestSchema = z
  .object({
    plateNumber: plateNumberSchema,
    agreed: z.literal(true),
    documentVersion: z.string().trim().min(1).max(20),
  })
  .strict();

const guestMerchantResponseSchema = z.object({
  merchant: z.object({ id: z.number().int(), name: z.string() }),
  ticket: ticketDesignSchema.nullable(),
});

const guestSessionResponseSchema = z.object({
  session: currentSessionSchema,
  ticket: ticketDesignSchema.nullable(),
});

type GuestMerchantResponse = z.infer<typeof guestMerchantResponseSchema>;
type GuestSessionResponse = z.infer<typeof guestSessionResponseSchema>;
type GuestPickupRequest = z.infer<typeof guestPickupRequestSchema>;

export {
  PLATE_NUMBER_PATTERN,
  guestMerchantIdSchema,
  guestMerchantResponseSchema,
  guestPickupRequestSchema,
  guestSessionRequestSchema,
  guestSessionResponseSchema,
  normalizePlateNumber,
};
export type { GuestMerchantResponse, GuestPickupRequest, GuestSessionResponse };
