"use client";

import useOnboarding from "@/hooks/useOnboarding";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@makkigo/ui";
import { FormProvider, useForm } from "react-hook-form";
import { onboardingFlow } from "@/configs/onboarding/onboardingFlow";
import { onboardingSchema } from "@/libs/onboarding/schemas/onboarding.schema";
import type { OnboardingFormValues } from "@/types/pages/onboarding";

export default function OnboardingContent() {
  const {
    onboardingStep,
    buttonType,
    handleMoveNextStep,
  } = useOnboarding();
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      vehicleNumber: "",
      phoneNumber: "",
      carBrand: "",
      carModel: "",
    },
  });
  const step = onboardingFlow[onboardingStep];
  const StepComponent = step.component;

  const handlePrimaryAction = async () => {
    const isValid = await form.trigger(step.fields, { shouldFocus: true });

    if (isValid) {
      handleMoveNextStep();
    }
  };

  return (
    <FormProvider {...form}>
      <form
        className="flex flex-col w-full h-full max-w-md pt-6 mx-auto"
        onSubmit={event => {
          event.preventDefault();
          void handlePrimaryAction();
        }}
      >
        <h1 className="text-xl font-bold text-(--base-color)">
          {step.title}
        </h1>
        <div className="flex flex-1 pt-4">
          <StepComponent />
        </div>
        <Button type="submit" size="lg" className="w-full h-12">
          {buttonType === "NEXT" ? "다음으로" : "시작하기"}
        </Button>
      </form>
    </FormProvider>
  );
}
