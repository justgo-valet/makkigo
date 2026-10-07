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

  const parsedResponse = carModelsResponseSchema.safeParse(response);
  if (!parsedResponse.success) {
    throw new Error("유효하지 않은 응답입니다.");
  }
  return parsedResponse.data;
};

export { getCarModels };
