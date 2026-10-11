import { z } from "zod";

import { boothAgentRequestStatusSchema, workTimeSchema } from "./agent-request";

const BOOTH_AGENT_PAGE_SIZE = 10;

const boothAgentPageSchema = z.coerce.number().int().positive();

const boothAgentSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().nullable(),
  status: boothAgentRequestStatusSchema,
  workStartTime: workTimeSchema.nullable(),
  workEndTime: workTimeSchema.nullable(),
  working: z.boolean(),
  updatedAt: z.string().datetime(),
});

const boothAgentListResponseSchema = z.object({
  items: z.array(boothAgentSchema),
  page: z.number().int().positive(),
  totalPages: z.number().int().positive(),
});

export { BOOTH_AGENT_PAGE_SIZE, boothAgentListResponseSchema, boothAgentPageSchema, boothAgentSchema };
export type BoothAgent = z.infer<typeof boothAgentSchema>;
export type BoothAgentListResponse = z.infer<typeof boothAgentListResponseSchema>;
