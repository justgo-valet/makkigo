import { isHTTPError } from "ky";

import { apiClient } from "@/libs/common/api/apiClient";
import {
  updateVehicleNumberErrorResponseSchema,
  updateVehicleNumberRequestSchema,
} from "@/libs/vehicle/contracts/updateVehicle";

import type { UpdateVehicleNumberErrorCode } from "@/libs/vehicle/contracts/updateVehicle";

const updateVehicleNumber = async (vehicleNumber: string) => {
  await apiClient.patch("users/me/vehicle", {
    json: updateVehicleNumberRequestSchema.parse({ vehicleNumber }),
  });
};

const getUpdateVehicleNumberErrorCode = (error: unknown): UpdateVehicleNumberErrorCode | null => {
  if (!isHTTPError(error)) return null;

  const body = updateVehicleNumberErrorResponseSchema.safeParse(error.data);

  return body.success ? body.data.code : null;
};

export { getUpdateVehicleNumberErrorCode, updateVehicleNumber };
