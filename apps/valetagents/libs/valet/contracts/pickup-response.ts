import { z } from "zod";

const MAX_ACTUAL_FEE = 10_000_000;
const MAX_EXPECTED_PICKUP_MINUTES = 180;

const pickupResponseRequestSchema = z
  .object({
    actualFee: z.number().int().min(0).max(MAX_ACTUAL_FEE),
    expectedPickupMinutes: z.number().int().min(1).max(MAX_EXPECTED_PICKUP_MINUTES),
  })
  .strict();

export { MAX_ACTUAL_FEE, MAX_EXPECTED_PICKUP_MINUTES, pickupResponseRequestSchema };
export type PickupResponseRequest = z.infer<typeof pickupResponseRequestSchema>;
