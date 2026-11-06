import { ticketDesignSchema } from "@makkigo/ticket-design";
import { z } from "zod";

const MAX_TICKET_IMAGE_BYTES = 5 * 1024 * 1024;
const ticketImageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

const ticketSaveBodySchema = z
  .object({
    merchantId: z.number().int().positive().optional(),
    ticketId: z.number().int().positive().optional(),
    design: ticketDesignSchema,
  })
  .strict()
  .refine((body) => (body.ticketId === undefined) !== (body.merchantId === undefined));

const ticketImageUploadBodySchema = z
  .object({
    merchantId: z.number().int().positive(),
    contentType: z.enum(ticketImageMimeTypes),
    size: z.number().int().min(1).max(MAX_TICKET_IMAGE_BYTES),
  })
  .strict();

const ticketImageCompleteBodySchema = z.object({ uploadId: z.string().uuid() }).strict();

export {
  MAX_TICKET_IMAGE_BYTES,
  ticketImageCompleteBodySchema,
  ticketImageMimeTypes,
  ticketImageUploadBodySchema,
  ticketSaveBodySchema,
};
export type TicketImageMimeType = (typeof ticketImageMimeTypes)[number];
export type TicketSaveBody = z.infer<typeof ticketSaveBodySchema>;
