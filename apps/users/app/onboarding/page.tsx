"use client";

import { Button, FieldError } from "@makkigo/ui";

import ConsentSheet from "@/features/consent/components/ConsentSheet";
import AnimatedOnboarding from "@/features/onboarding/components/AnimatedOnboarding";
import CarBrandStep from "@/features/onboarding/components/CarBrandStep";
import CarModelStep from "@/features/onboarding/components/CarModelStep";
import CarNumberStep from "@/features/onboarding/components/CarNumberStep";
import PhoneNumberStep from "@/features/onboarding/components/PhoneNumberStep";
import { useOnboardingContent } from "@/features/onboarding/hooks/useOnboardingContent";

import type { OnboardingStepProps } from "@/features/onboarding/hooks/useOnboardingStep";
import type { OnboardingStep } from "@/features/onboarding/onboardingSteps";

interface StepContentProps {
  onboardingStep: OnboardingStep;
  stepProps: OnboardingStepProps;
}

function StepContent({ onboardingStep, stepProps }: Readonly<StepContentProps>) {
  switch (onboardingStep) {
    case "CAR_NUMBER":
      return <CarNumberStep {...stepProps.carNumber} />;
    case "PHONE_NUMBER":
      return <PhoneNumberStep {...stepProps.phoneNumber} />;
    case "CAR_BRAND":
      return <CarBrandStep {...stepProps.carBrand} />;
    case "CAR_MODEL":
      return <CarModelStep {...stepProps.carModel} />;
  }
}

export default function OnboardingContent() {
  const {
    onboardingStep,
    stepProps,
    isSubmitStep,
    isBusy,
    submitErrorMessage,
    isConsentSheetOpen,
    handleConsentsAgreed,
    handleSubmit,
  } = useOnboardingContent();

  return (
    <AnimatedOnboarding>
      <form
        className="flex flex-col w-full h-full max-w-md min-h-0 pt-2 mx-auto"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-1 min-h-0 pt-4 overflow-hidden">
          <StepContent onboardingStep={onboardingStep} stepProps={stepProps} />
        </div>
        <div className="relative z-10 flex flex-col gap-2 pt-2 shrink-0 bg-background">
          {isSubmitStep && <FieldError>{submitErrorMessage}</FieldError>}
          <Button type="submit" size="lg" className="h-12 w-full shadow-none" disabled={isBusy}>
            {isSubmitStep ? "시작하기" : "다음으로"}
          </Button>
        </div>
      </form>
      <ConsentSheet open={isConsentSheetOpen} onAgreed={handleConsentsAgreed} />
    </AnimatedOnboarding>
  );
}
