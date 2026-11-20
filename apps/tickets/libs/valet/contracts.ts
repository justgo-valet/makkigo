import { z } from "zod";

const activeValetSessionSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["ARRIVING", "PARKED", "PICKUP_REQUESTED", "PICKUP_PREPARING"]),
  plateNumber: z.string(),
  ticketNumber: z.number().int().positive().nullable(),
  carImageUrl: z.string().url(),
  expectedArrivalAt: z.string().datetime().nullable(),
  arrivalDelayMinutes: z.number().int().positive().nullable(),
  parkedAt: z.string().datetime().nullable(),
  pickupRequestedAt: z.string().datetime().nullable(),
  fee: z.number().int().nullable(),
});

const completedValetSessionSchema = z.object({
  id: z.number().int().positive(),
  plateNumber: z.string(),
  ticketNumber: z.number().int().positive().nullable(),
  carImageUrl: z.string().url(),
  completedAt: z.string().datetime(),
  fee: z.number().int().nullable(),
});

const valetSessionListResponseSchema = z.object({
  items: z.array(activeValetSessionSchema),
  completed: z.array(completedValetSessionSchema),
});

export { valetSessionListResponseSchema };
export type ActiveValetSession = z.infer<typeof activeValetSessionSchema>;
export type CompletedValetSession = z.infer<typeof completedValetSessionSchema>;
export type ValetSessionListResponse = z.infer<typeof valetSessionListResponseSchema>;
