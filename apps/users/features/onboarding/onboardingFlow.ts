import { ONBOARDING_STEPS } from "./onboardingSteps";

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

const findFirstIncompleteStep = (values: OnboardingFormValues, currentStep: OnboardingStep) =>
  ONBOARDING_STEPS.slice(0, ONBOARDING_STEPS.indexOf(currentStep)).find((step) =>
    onboardingFlow[step].fields.some((field) => !values[field].trim()),
  );

export { onboardingFlow, DEFAULT_FORM_VALUES, findFirstIncompleteStep };
