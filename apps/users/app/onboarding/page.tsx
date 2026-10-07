"use client";

import { Button, FieldError } from "@makkigo/ui";

import ConsentSheet from "@/features/consent/components/ConsentSheet";
import AnimatedOnboarding from "@/features/onboarding/components/AnimatedOnboarding";
import { useOnboardingContent } from "@/features/onboarding/hooks/useOnboardingContent";

export default function OnboardingContent() {
  const {
    StepComponent,
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
          <StepComponent />
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
