import { apiClient } from "@/libs/common/api/apiClient";
import { myVehicleResponseSchema } from "@/libs/user/contracts/myVehicle";

import type { MyVehicleResponse } from "@/libs/user/contracts/myVehicle";

const getMyVehicle = async (): Promise<MyVehicleResponse> => {
  const response = await apiClient.get("users/me/vehicle").json<unknown>();

  const parsedResponse = myVehicleResponseSchema.safeParse(response);
  if (!parsedResponse.success) {
    throw new Error("유효하지 않은 응답입니다.");
  }
  return parsedResponse.data;
};

export { getMyVehicle };
