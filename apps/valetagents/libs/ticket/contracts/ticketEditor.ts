import { z } from "zod";

import { ticketDesignSchema } from "@makkigo/ticket-design";

const ticketEditorSaveBodySchema = z
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
    contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    size: z.number().int().min(1).max(5 * 1024 * 1024),
  })
  .strict();

const ticketImageCompleteBodySchema = z.object({ uploadId: z.string().uuid() }).strict();

export { ticketEditorSaveBodySchema, ticketImageCompleteBodySchema, ticketImageUploadBodySchema };
export type TicketEditorSaveBody = z.infer<typeof ticketEditorSaveBodySchema>;
export type TicketImageUploadBody = z.infer<typeof ticketImageUploadBodySchema>;
