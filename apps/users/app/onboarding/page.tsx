"use client";

import { Button } from "@makkigo/ui";
import { useFormContext } from "react-hook-form";

import { onboardingFlow } from "@/configs/onboarding/onboardingFlow";
import useOnboarding from "@/hooks/useOnboarding";

import type { OnboardingFormValues } from "@/types/pages/onboarding";

export default function OnboardingContent() {
  const { onboardingStep, buttonType, handleMoveNextStep } = useOnboarding();
  const form = useFormContext<OnboardingFormValues>();
  const step = onboardingFlow[onboardingStep];
  const StepComponent = step.component;

  const handlePrimaryAction = async () => {
    const isValid = await form.trigger(step.fields, { shouldFocus: true });

    if (!isValid) return;

    handleMoveNextStep();
  };

  return (
    <form
      className="flex flex-col w-full h-full max-w-md min-h-0 pt-2 mx-auto"
      onSubmit={(event) => {
        event.preventDefault();
        void handlePrimaryAction();
      }}
    >
      <div className="flex flex-1 min-h-0 pt-4 overflow-hidden">
        <StepComponent />
      </div>
      <div className="relative z-10 shrink-0 bg-background pt-2">
        <Button type="submit" size="lg" className="h-12 w-full shadow-none">
          {buttonType === "NEXT" ? "다음으로" : "시작하기"}
        </Button>
      </div>
    </form>
  );
}
