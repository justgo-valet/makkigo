import { z } from "zod";

const sendArrivalRequestSchema = z.object({
  merchantId: z.number().int().positive(),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
});

const sendArrivalResponseSchema = z.object({
  id: z.number().int(),
});

const valetSessionIdSchema = z.coerce.number().int().positive();

const ARRIVAL_DELAY_MINUTES = [5, 10, 15] as const;

const delayArrivalRequestSchema = z.object({
  minutes: z.literal(ARRIVAL_DELAY_MINUTES),
});

const ARRIVAL_ERROR_CODES = [
  "VEHICLE_REQUIRED",
  "MERCHANT_NOT_FOUND",
  "ACTIVE_SESSION_EXISTS",
  "NO_AVAILABLE_BOOTH",
] as const;

const CANCEL_ARRIVAL_ERROR_CODES = ["SESSION_NOT_FOUND", "NOT_CANCELLABLE"] as const;
const DELAY_ARRIVAL_ERROR_CODES = ["SESSION_NOT_FOUND", "NOT_DELAYABLE"] as const;

const arrivalErrorResponseSchema = z.object({ code: z.enum(ARRIVAL_ERROR_CODES) });
const cancelArrivalErrorResponseSchema = z.object({ code: z.enum(CANCEL_ARRIVAL_ERROR_CODES) });
const delayArrivalErrorResponseSchema = z.object({ code: z.enum(DELAY_ARRIVAL_ERROR_CODES) });

type SendArrivalRequest = z.infer<typeof sendArrivalRequestSchema>;
type SendArrivalResponse = z.infer<typeof sendArrivalResponseSchema>;
type ArrivalErrorCode = (typeof ARRIVAL_ERROR_CODES)[number];
type CancelArrivalErrorCode = (typeof CANCEL_ARRIVAL_ERROR_CODES)[number];
type DelayArrivalRequest = z.infer<typeof delayArrivalRequestSchema>;
type DelayArrivalErrorCode = (typeof DELAY_ARRIVAL_ERROR_CODES)[number];

export {
  ARRIVAL_DELAY_MINUTES,
  arrivalErrorResponseSchema,
  cancelArrivalErrorResponseSchema,
  delayArrivalErrorResponseSchema,
  delayArrivalRequestSchema,
  sendArrivalRequestSchema,
  sendArrivalResponseSchema,
  valetSessionIdSchema,
};
export type {
  ArrivalErrorCode,
  CancelArrivalErrorCode,
  DelayArrivalErrorCode,
  DelayArrivalRequest,
  SendArrivalRequest,
  SendArrivalResponse,
};
