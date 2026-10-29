import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { getOnboardingStepIndex, ONBOARDING_STEPS } from "@/features/onboarding/onboardingSteps";
import { useOnboardingTransition } from "@/features/onboarding/onboardingTransition.store";

import type { OnboardingStep } from "@/features/onboarding/onboardingSteps";

type OnboardingButtonType = "NEXT" | "SUBMIT";

const CUSTOM_INPUT_PARAM = "input";
const CUSTOM_INPUT_VALUE = "custom";
const CUSTOM_INPUT_STEPS = new Set<OnboardingStep>(["CAR_BRAND", "CAR_MODEL"]);

const useOnboarding = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setTransitionDirection = useOnboardingTransition((state) => state.setDirection);

  const stepIndex = getOnboardingStepIndex(searchParams.get("step"));
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1;
  const buttonType: OnboardingButtonType = isLastStep ? "SUBMIT" : "NEXT";
  const isCustomInput =
    searchParams.get(CUSTOM_INPUT_PARAM) === CUSTOM_INPUT_VALUE &&
    CUSTOM_INPUT_STEPS.has(ONBOARDING_STEPS[stepIndex]);

  const replaceSearchParams = useCallback(
    (params: URLSearchParams) => {
      // 스텝 전환은 클라이언트 상태라 서버 내비게이션 없이 URL만 갱신한다.
      window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
    },
    [pathname],
  );

  const navigateToStep = useCallback(
    (targetStepIndex: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", ONBOARDING_STEPS[targetStepIndex]);
      params.delete(CUSTOM_INPUT_PARAM);
      replaceSearchParams(params);
    },
    [replaceSearchParams, searchParams],
  );

  const setCustomInput = useCallback(
    (isOpen: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (isOpen) params.set(CUSTOM_INPUT_PARAM, CUSTOM_INPUT_VALUE);
      else params.delete(CUSTOM_INPUT_PARAM);

      setTransitionDirection(isOpen ? "forward" : "backward");
      replaceSearchParams(params);
    },
    [replaceSearchParams, searchParams, setTransitionDirection],
  );

  const handleMoveNextStep = useCallback(() => {
    if (isLastStep) {
      router.replace("/");
      return;
    }

    setTransitionDirection("forward");
    navigateToStep(stepIndex + 1);
  }, [isLastStep, navigateToStep, router, setTransitionDirection, stepIndex]);

  const openCustomInput = useCallback(() => setCustomInput(true), [setCustomInput]);

  const handleBack = useCallback(() => {
    if (isCustomInput) {
      setCustomInput(false);
      return;
    }

    if (isFirstStep) {
      router.back();
      return;
    }

    setTransitionDirection("backward");
    navigateToStep(stepIndex - 1);
  }, [
    isCustomInput,
    isFirstStep,
    navigateToStep,
    router,
    setCustomInput,
    setTransitionDirection,
    stepIndex,
  ]);

  const handleMoveToStep = useCallback(
    (targetStep: OnboardingStep) => {
      const targetStepIndex = ONBOARDING_STEPS.indexOf(targetStep);

      setTransitionDirection(targetStepIndex < stepIndex ? "backward" : "forward");
      navigateToStep(targetStepIndex);
    },
    [navigateToStep, setTransitionDirection, stepIndex],
  );

  return {
    onboardingStep: ONBOARDING_STEPS[stepIndex],
    isCustomInput,
    openCustomInput,
    stepIndex,
    totalSteps: ONBOARDING_STEPS.length,
    buttonType,
    handleMoveNextStep,
    handleBack,
    handleMoveToStep,
    isFirstStep,
    isLastStep,
  };
};

export { useOnboarding };
