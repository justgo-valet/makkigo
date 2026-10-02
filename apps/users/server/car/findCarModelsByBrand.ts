import type { CarModelsResponse } from "@/libs/onboarding/contracts/carModels";

const findCarModelsByBrand = async (brand: string): Promise<CarModelsResponse> => {
  // TODO: 차량 모델 데이터 소스와 캐시 정책이 확정되면 repository 호출로 교체합니다.
  void brand;
  return [];
};

export { findCarModelsByBrand };
