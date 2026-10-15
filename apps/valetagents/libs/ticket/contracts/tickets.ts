import { ticketDesignSchema } from "@makkigo/ticket-design";
import { z } from "zod";

const ticketListItemSchema = z
  .object({
    id: z.number().int().positive(),
    design: ticketDesignSchema,
  })
  .strict();

const ticketListResponseSchema = z.object({ items: z.array(ticketListItemSchema) }).strict();

export { ticketListItemSchema, ticketListResponseSchema };
export type TicketListItem = z.infer<typeof ticketListItemSchema>;
export type TicketListResponse = z.infer<typeof ticketListResponseSchema>;
