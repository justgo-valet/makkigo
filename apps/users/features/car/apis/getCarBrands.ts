import { carBrandsResponseSchema } from "@/libs/car/contracts/carBrands";
import { apiClient } from "@/libs/common/api/apiClient";

import type { CarBrandsResponse } from "@/libs/car/contracts/carBrands";

const getCarBrands = async (): Promise<CarBrandsResponse> => {
  const response = await apiClient.get("cars/brands").json<unknown>();

  const parsedResponse = carBrandsResponseSchema.safeParse(response);
  if (!parsedResponse.success) {
    throw new Error("유효하지 않은 응답입니다.");
  }
  return parsedResponse.data;
};

export { getCarBrands };
