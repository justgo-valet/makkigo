import { apiClient } from "@/libs/common/api/apiClient";

import type { CheckVehicleNumberRequest } from "@/libs/onboarding/contracts/onboarding";

const checkVehicleNumber = async (request: CheckVehicleNumberRequest) => {
  await apiClient.post("onboarding/vehicle-number/check", { json: request });
};

export { checkVehicleNumber };
