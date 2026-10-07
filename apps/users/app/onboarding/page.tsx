"use client";

import { Button } from "@makkigo/ui";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

import AnimatedOnboarding from "@/components/features/onboarding/AnimatedOnboarding";
import ConsentSheet from "@/components/features/onboarding/ConsentSheet";
import { onboardingFlow } from "@/configs/onboarding/onboardingFlow";
import useOnboarding from "@/hooks/useOnboarding";

import type { OnboardingFormValues } from "@/libs/onboarding/schemas/onboarding.schema";

export default function OnboardingContent() {
  const { onboardingStep, buttonType, handleMoveNextStep } = useOnboarding();
  const form = useFormContext<OnboardingFormValues>();
  const [hasAgreedConsents, setHasAgreedConsents] = useState(false);
  const step = onboardingFlow[onboardingStep];
  const StepComponent = step.component;

  const handlePrimaryAction = async () => {
    const isValid = await form.trigger(step.fields, { shouldFocus: true });

    if (!isValid) return;

    handleMoveNextStep();
  };

  return (
    <AnimatedOnboarding>
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
      <ConsentSheet open={!hasAgreedConsents} onAgreed={() => setHasAgreedConsents(true)} />
    </AnimatedOnboarding>
  );
}
