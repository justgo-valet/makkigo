import { z } from "zod";

const CURRENT_SESSION_STATUSES = [
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

const bankAccountSchema = z.object({
  bankName: z.string(),
  accountNumber: z.string(),
  accountHolder: z.string(),
});

const currentSessionSchema = z.object({
  id: z.number().int(),
  status: z.enum(CURRENT_SESSION_STATUSES),
  hasTicket: z.boolean(),
  plateNumber: z.string(),
  merchantName: z.string().nullable(),
  boothName: z.string().nullable(),
  arrivalNotifiedAt: z.iso.datetime().nullable(),
  expectedArrivalAt: z.iso.datetime().nullable(),
  arrivalDelayMinutes: z.number().int().nullable(),
  parkedAt: z.iso.datetime().nullable(),
  pickupRequestedAt: z.iso.datetime().nullable(),
  waitingPickupCount: z.number().int().nullable(),
  fee: valetFeeSchema.nullable(),
  actualFee: z.number().int().nullable(),
  expectedPickupAt: z.iso.datetime().nullable(),
  bankAccount: bankAccountSchema.nullable(),
});

const currentSessionResponseSchema = z.object({
  session: currentSessionSchema.nullable(),
});

type CurrentSessionStatus = (typeof CURRENT_SESSION_STATUSES)[number];
type ValetFee = z.infer<typeof valetFeeSchema>;
type CurrentSession = z.infer<typeof currentSessionSchema>;
type CurrentSessionResponse = z.infer<typeof currentSessionResponseSchema>;

export { CURRENT_SESSION_STATUSES, currentSessionResponseSchema, currentSessionSchema };
export type { CurrentSession, CurrentSessionResponse, CurrentSessionStatus, ValetFee };
