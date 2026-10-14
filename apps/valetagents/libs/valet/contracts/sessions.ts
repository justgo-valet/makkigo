import { z } from "zod";

const BOOTH_VALET_SESSION_STATUSES = [
  "ARRIVING",
  "PARKED",
  "PICKUP_REQUESTED",
  "PICKUP_PREPARING",
] as const;

const valetFeeSchema = z.object({
  baseMinutes: z.number().int(),
  baseFee: z.number().int(),
  extraUnitMinutes: z.number().int(),
  extraUnitFee: z.number().int(),
  usedMinutes: z.number().int(),
  extraUnits: z.number().int(),
  extraFee: z.number().int(),
  total: z.number().int(),
});

const boothValetSessionSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(BOOTH_VALET_SESSION_STATUSES),
  plateNumber: z.string(),
  carImageUrl: z.string().url(),
  expectedArrivalAt: z.string().datetime().nullable(),
  arrivalDelayMinutes: z.number().int().positive().nullable(),
  parkedAt: z.string().datetime().nullable(),
  pickupRequestedAt: z.string().datetime().nullable(),
  fee: valetFeeSchema.nullable(),
  expectedPickupAt: z.string().datetime().nullable(),
});

const completedValetSessionSchema = z.object({
  id: z.number().int().positive(),
  plateNumber: z.string(),
  carImageUrl: z.string().url(),
});

const boothValetSessionListResponseSchema = z.object({
  items: z.array(boothValetSessionSchema),
  completed: z.array(completedValetSessionSchema),
});

export {
  BOOTH_VALET_SESSION_STATUSES,
  boothValetSessionListResponseSchema,
  boothValetSessionSchema,
};
export type BoothValetSession = z.infer<typeof boothValetSessionSchema>;
export type ValetFee = z.infer<typeof valetFeeSchema>;
export type CompletedValetSession = z.infer<typeof completedValetSessionSchema>;
export type BoothValetSessionListResponse = z.infer<typeof boothValetSessionListResponseSchema>;
