import CarBrandStep from "@/components/features/onboarding/CarBrandStep";
import CarModelStep from "@/components/features/onboarding/CarModelStep";
import CarNumberStep from "@/components/features/onboarding/CarNumberStep";
import PhoneNumberStep from "@/components/features/onboarding/PhoneNumberStep";

import type { OnboardingStep } from "./onboardingSteps";
import type { OnboardingFormValues } from "@/types/pages/onboarding";
import type { ComponentType } from "react";

interface OnboardingStepDefinition {
  description?: string;
  fields: readonly (keyof OnboardingFormValues)[];
  component: ComponentType;
}

const DEFAULT_FORM_VALUES: OnboardingFormValues = {
  vehicleNumber: "",
  phoneNumber: "",
  carBrand: "",
  carModel: "",
};

const onboardingFlow = {
  CAR_NUMBER: {
    fields: ["vehicleNumber"],
    component: CarNumberStep,
  },
  PHONE_NUMBER: {
    fields: ["phoneNumber"],
    component: PhoneNumberStep,
  },
  CAR_BRAND: {
    fields: ["carBrand"],
    component: CarBrandStep,
  },
  CAR_MODEL: {
    fields: ["carModel"],
    component: CarModelStep,
  },
} satisfies Record<OnboardingStep, OnboardingStepDefinition>;

export { onboardingFlow, DEFAULT_FORM_VALUES };
