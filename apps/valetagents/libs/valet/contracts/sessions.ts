import { z } from "zod";

const BOOTH_VALET_SESSION_STATUSES = [
  "ARRIVING",
  "PARKED",
  "PICKUP_REQUESTED",
  "PICKUP_PREPARING",
] as const;

const boothValetSessionSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(BOOTH_VALET_SESSION_STATUSES),
  plateNumber: z.string(),
  carImageUrl: z.string().url(),
  expectedArrivalAt: z.string().datetime().nullable(),
  arrivalDelayMinutes: z.number().int().positive().nullable(),
  parkedAt: z.string().datetime().nullable(),
  pickupRequestedAt: z.string().datetime().nullable(),
});

const completedValetSessionSchema = z.object({
  id: z.number().int().positive(),
  plateNumber: z.string(),
  carImageUrl: z.string().url(),
  completedAt: z.string().datetime(),
  fee: z.number().int().nullable(),
});

const boothValetSessionListResponseSchema = z.object({
  items: z.array(boothValetSessionSchema),
  completed: z.array(completedValetSessionSchema),
  notificationsEnabled: z.boolean(),
});

export {
  BOOTH_VALET_SESSION_STATUSES,
  boothValetSessionListResponseSchema,
  boothValetSessionSchema,
};
export type BoothValetSession = z.infer<typeof boothValetSessionSchema>;
export type CompletedValetSession = z.infer<typeof completedValetSessionSchema>;
export type BoothValetSessionListResponse = z.infer<typeof boothValetSessionListResponseSchema>;
