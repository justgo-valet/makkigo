import { apiClient } from "@/libs/common/api/apiClient";
import { vehicleResponseSchema } from "@/libs/vehicle/contracts/vehicle";

import type { VehicleResponse } from "@/libs/vehicle/contracts/vehicle";

const getVehicles = async (): Promise<VehicleResponse> =>
  vehicleResponseSchema.parse(await apiClient.get("users/me/vehicle").json());

export { getVehicles };
