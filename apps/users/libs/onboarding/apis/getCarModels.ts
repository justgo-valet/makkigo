import ky from "ky";

import { carModelsResponseSchema } from "@/libs/onboarding/contracts/carModels";

import type { CarModelsResponse } from "@/libs/onboarding/contracts/carModels";

const getCarModels = async (brand: string): Promise<CarModelsResponse> => {
  const normalizedBrand = brand.trim();

  if (!normalizedBrand) {
    throw new Error("차량 브랜드는 필수입니다.");
  }

  const response = await ky
    .get("/api/car/get-car-models", {
      searchParams: { brand: normalizedBrand },
    })
    .json<unknown>();

  return carModelsResponseSchema.parse(response);
};

export default getCarModels;
export { getCarModels };
