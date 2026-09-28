import type { ComponentType } from "react";
import CarBrandStep from "../../components/features/onboarding/CarBrandStep";
import CarModelStep from "../../components/features/onboarding/CarModelStep";
import CarNumberStep from "../../components/features/onboarding/CarNumberStep";
import PhoneNumberStep from "../../components/features/onboarding/PhoneNumberStep";
import type { OnboardingFormValues } from "../../types/pages/onboarding";
import type { OnboardingStep } from "./onboardingSteps";

interface OnboardingStepDefinition {
  title: string;
  description?: string;
  fields: readonly (keyof OnboardingFormValues)[];
  component: ComponentType;
}

const onboardingFlow = {
  CAR_NUMBER: {
    title: "차량 번호를 알려주세요",
    fields: ["vehicleNumber"],
    component: CarNumberStep,
  },
  PHONE_NUMBER: {
    title: "휴대전화 번호를 알려주세요",
    fields: ["phoneNumber"],
    component: PhoneNumberStep,
  },
  CAR_BRAND: {
    title: "차량 브랜드를 선택해주세요",
    fields: ["carBrand"],
    component: CarBrandStep,
  },
  CAR_MODEL: {
    title: "차량 모델을 선택해주세요",
    fields: ["carModel"],
    component: CarModelStep,
  },
} satisfies Record<OnboardingStep, OnboardingStepDefinition>;

export { onboardingFlow };
