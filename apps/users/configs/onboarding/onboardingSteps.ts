const ONBOARDING_STEPS = [
  "CAR_NUMBER",
  "PHONE_NUMBER",
  "CAR_BRAND",
  "CAR_MODEL",
] as const;

type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

const getOnboardingStepIndex = (step: string | null) => {
  const stepIndex = ONBOARDING_STEPS.findIndex(
    onboardingStep => onboardingStep === step,
  );

  return stepIndex >= 0 ? stepIndex : 0;
};

export { getOnboardingStepIndex, ONBOARDING_STEPS };
export type { OnboardingStep };
