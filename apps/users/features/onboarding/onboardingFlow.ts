import CarBrandStep from "@/features/onboarding/components/CarBrandStep";
import CarModelStep from "@/features/onboarding/components/CarModelStep";
import CarNumberStep from "@/features/onboarding/components/CarNumberStep";
import PhoneNumberStep from "@/features/onboarding/components/PhoneNumberStep";

import type { OnboardingStep } from "./onboardingSteps";
import type { OnboardingFormValues } from "@/features/onboarding/schemas/onboarding.schema";
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
