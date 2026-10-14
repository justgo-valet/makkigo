import { z } from "zod";

import { currentSessionSchema } from "@/libs/valet/contracts/currentSession";

const PICKUP_REQUEST_ERROR_CODES = [
  "SESSION_NOT_FOUND",
  "NOT_PARKED",
  "ALREADY_REQUESTED",
  "NO_BOOTH",
] as const;

const pickupRequestResponseSchema = z.object({ session: currentSessionSchema.nullable() });
const pickupRequestErrorResponseSchema = z.object({ code: z.enum(PICKUP_REQUEST_ERROR_CODES) });

type PickupRequestResponse = z.infer<typeof pickupRequestResponseSchema>;
type PickupRequestErrorCode = (typeof PICKUP_REQUEST_ERROR_CODES)[number];

export { pickupRequestErrorResponseSchema, pickupRequestResponseSchema };
export type { PickupRequestErrorCode, PickupRequestResponse };
