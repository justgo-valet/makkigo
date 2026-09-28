"use client";

import useOnboarding from "@/hooks/useOnboarding";
import { Button } from "@makkigo/ui";
import { useFormContext } from "react-hook-form";
import { onboardingFlow } from "@/configs/onboarding/onboardingFlow";
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
      className="mx-auto flex h-full w-full max-w-md flex-col pt-6"
      onSubmit={event => {
        event.preventDefault();
        void handlePrimaryAction();
      }}
    >
      <h1 className="text-xl font-bold text-(--base-color)">{step.title}</h1>
      <div className="flex flex-1 pt-4">
        <StepComponent />
      </div>
      <Button type="submit" size="lg" className="h-12 w-full">
        {buttonType === "NEXT" ? "다음으로" : "시작하기"}
      </Button>
    </form>
  );
}
