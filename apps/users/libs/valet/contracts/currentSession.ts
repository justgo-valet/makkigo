import { z } from "zod";

const currentValetSessionSchema = z.object({
  id: z.number().int(),
  status: z.enum(["ARRIVING", "PARKED", "PICKUP_REQUESTED", "PICKUP_PREPARING"]),
  merchantName: z.string().nullable(),
  arrivalNotifiedAt: z.string().nullable(),
  parkedAt: z.string().nullable(),
  waitingPickupCount: z.number().int().nullable(),
  currentFee: z.number().int().nullable(),
  actualFee: z.number().int().nullable(),
  expectedPickupAt: z.string().nullable(),
  bankAccount: z.string().nullable(),
});

const currentValetSessionResponseSchema = z.object({
  session: currentValetSessionSchema.nullable(),
});

type CurrentValetSession = z.infer<typeof currentValetSessionSchema>;
type CurrentValetSessionResponse = z.infer<typeof currentValetSessionResponseSchema>;

export { currentValetSessionResponseSchema };
export type { CurrentValetSession, CurrentValetSessionResponse };
