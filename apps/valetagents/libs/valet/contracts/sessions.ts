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
  parkedAt: z.string().datetime().nullable(),
  expectedPickupAt: z.string().datetime().nullable(),
});

const boothValetSessionListResponseSchema = z.object({
  items: z.array(boothValetSessionSchema),
});

export {
  BOOTH_VALET_SESSION_STATUSES,
  boothValetSessionListResponseSchema,
  boothValetSessionSchema,
};
export type BoothValetSession = z.infer<typeof boothValetSessionSchema>;
export type BoothValetSessionListResponse = z.infer<typeof boothValetSessionListResponseSchema>;
