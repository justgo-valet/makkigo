import { z } from "zod";

import { checkVehicleNumberRequestSchema } from "@/libs/onboarding/contracts/onboarding";

const updateVehicleNumberRequestSchema = checkVehicleNumberRequestSchema;

const UPDATE_VEHICLE_NUMBER_ERROR_CODES = [
  "VEHICLE_REQUIRED",
  "DUPLICATE_VEHICLE",
  "ACTIVE_SESSION_EXISTS",
] as const;

const updateVehicleNumberErrorResponseSchema = z.object({
  code: z.enum(UPDATE_VEHICLE_NUMBER_ERROR_CODES),
});

type UpdateVehicleNumberRequest = z.infer<typeof updateVehicleNumberRequestSchema>;
type UpdateVehicleNumberErrorCode = (typeof UPDATE_VEHICLE_NUMBER_ERROR_CODES)[number];

export { updateVehicleNumberErrorResponseSchema, updateVehicleNumberRequestSchema };
export type { UpdateVehicleNumberErrorCode, UpdateVehicleNumberRequest };
