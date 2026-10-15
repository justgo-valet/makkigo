import { z } from "zod";

import { selectedBoothSchema } from "./booths";
import { WORK_TIME_PATTERN } from "../workTime";

const boothAgentRequestStatusSchema = z.enum(["REQUESTED", "APPROVED", "REJECTED"]);
const workTimeSchema = z.string().regex(WORK_TIME_PATTERN);

const agentRequestBodySchema = z
  .object({ workStartTime: workTimeSchema, workEndTime: workTimeSchema })
  .strict();

const requestSummaryWithoutBoothSchema = z.object({
  id: z.number().int().positive(),
  status: boothAgentRequestStatusSchema,
  workStartTime: workTimeSchema.nullable(),
  workEndTime: workTimeSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const requestSummarySchema = requestSummaryWithoutBoothSchema.extend({ booth: selectedBoothSchema });

const searchItemSchema = selectedBoothSchema.extend({
  request: requestSummaryWithoutBoothSchema.nullable(),
});

const boothSearchResponseSchema = z.object({ items: z.array(searchItemSchema) });
const agentRequestOutcomeSchema = z.enum(["CREATED", "UPDATED", "REOPENED"]);
const agentRequestResponseSchema = z.object({
  request: requestSummarySchema,
  outcome: agentRequestOutcomeSchema,
});

export {
  agentRequestBodySchema,
  agentRequestOutcomeSchema,
  agentRequestResponseSchema,
  boothAgentRequestStatusSchema,
  boothSearchResponseSchema,
  requestSummarySchema,
  requestSummaryWithoutBoothSchema,
  searchItemSchema,
  workTimeSchema,
};
export type AgentRequestBody = z.infer<typeof agentRequestBodySchema>;
export type AgentRequestOutcome = z.infer<typeof agentRequestOutcomeSchema>;
export type AgentRequestResponse = z.infer<typeof agentRequestResponseSchema>;
export type BoothAgentRequestStatus = z.infer<typeof boothAgentRequestStatusSchema>;
export type BoothSearchResponse = z.infer<typeof boothSearchResponseSchema>;
export type RequestSummary = z.infer<typeof requestSummarySchema>;
export type RequestSummaryWithoutBooth = z.infer<typeof requestSummaryWithoutBoothSchema>;
export type SearchItem = z.infer<typeof searchItemSchema>;
