import {
  getOnboardingStepIndex,
  ONBOARDING_STEPS,
} from "@/configs/onboarding/onboardingSteps";
import { useOnboardingTransition } from "@/stores/onboardingTransition";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type OnboardingButtonType = "NEXT" | "SUBMIT";

const useOnboarding = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setTransitionDirection = useOnboardingTransition(
    state => state.setDirection,
  );

  const stepIndex = getOnboardingStepIndex(searchParams.get("step"));
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1;
  const buttonType: OnboardingButtonType = isLastStep ? "SUBMIT" : "NEXT";

  const navigateToStep = useCallback(
    (targetStepIndex: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", ONBOARDING_STEPS[targetStepIndex]);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const handleMoveNextStep = useCallback(() => {
    if (isLastStep) {
      router.replace("/");
      return;
    }

    setTransitionDirection("forward");
    navigateToStep(stepIndex + 1);
  }, [isLastStep, navigateToStep, router, setTransitionDirection, stepIndex]);

  const handleBack = useCallback(() => {
    if (isFirstStep) {
      router.back();
      return;
    }

    setTransitionDirection("backward");
    navigateToStep(stepIndex - 1);
  }, [isFirstStep, navigateToStep, router, setTransitionDirection, stepIndex]);

  return {
    onboardingStep: ONBOARDING_STEPS[stepIndex],
    stepIndex,
    totalSteps: ONBOARDING_STEPS.length,
    buttonType,
    handleMoveNextStep,
    handleBack,
    isFirstStep,
    isLastStep,
  };
};

export default useOnboarding;
