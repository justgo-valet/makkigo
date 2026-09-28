const ONBOARDING_STEPS = [
  "CAR_NUMBER",
  "PHONE_NUMBER",
  "CAR_BRAND",
  "CAR_MODEL",
] as const;

type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export { ONBOARDING_STEPS };
export type { OnboardingStep };
