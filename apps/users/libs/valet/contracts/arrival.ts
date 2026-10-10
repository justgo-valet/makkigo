import { z } from "zod";

const sendArrivalRequestSchema = z.object({
  merchantId: z.number().int().positive(),
});

const sendArrivalResponseSchema = z.object({
  id: z.number().int(),
});

const ARRIVAL_ERROR_CODES = [
  "VEHICLE_REQUIRED",
  "MERCHANT_NOT_FOUND",
  "ACTIVE_SESSION_EXISTS",
  "NO_AVAILABLE_BOOTH",
] as const;

const arrivalErrorResponseSchema = z.object({ code: z.enum(ARRIVAL_ERROR_CODES) });

type SendArrivalRequest = z.infer<typeof sendArrivalRequestSchema>;
type SendArrivalResponse = z.infer<typeof sendArrivalResponseSchema>;
type ArrivalErrorCode = (typeof ARRIVAL_ERROR_CODES)[number];

export { arrivalErrorResponseSchema, sendArrivalRequestSchema, sendArrivalResponseSchema };
export type { ArrivalErrorCode, SendArrivalRequest, SendArrivalResponse };
