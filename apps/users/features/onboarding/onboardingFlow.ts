import type { OnboardingStep } from "./onboardingSteps";
import type { OnboardingFormValues } from "@/features/onboarding/schemas/onboarding.schema";

interface OnboardingStepDefinition {
  fields: readonly (keyof OnboardingFormValues)[];
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
  },
  PHONE_NUMBER: {
    fields: ["phoneNumber"],
  },
  CAR_BRAND: {
    fields: ["carBrand"],
  },
  CAR_MODEL: {
    fields: ["carModel"],
  },
} satisfies Record<OnboardingStep, OnboardingStepDefinition>;

export { onboardingFlow, DEFAULT_FORM_VALUES };
