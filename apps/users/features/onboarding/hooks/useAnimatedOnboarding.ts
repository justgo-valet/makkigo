import { useReducedMotion } from "motion/react";
import { useSearchParams } from "next/navigation";

import { useOnboarding } from "@/features/onboarding/hooks/useOnboarding";
import { useOnboardingHeader } from "@/features/onboarding/hooks/useOnboardingHeader";
import { ONBOARDING_TRANSITION, SLIDE_DISTANCE } from "@/features/onboarding/onboardingAnimation";
import { getOnboardingStepIndex, ONBOARDING_STEPS } from "@/features/onboarding/onboardingSteps";
import { useOnboardingTransition } from "@/features/onboarding/onboardingTransition.store";

import type { Variants } from "motion/react";

const createSlideVariants = (shouldReduceMotion: boolean): Variants => {
  const distance = shouldReduceMotion ? 0 : SLIDE_DISTANCE;
  const hiddenOpacity = shouldReduceMotion ? 1 : 0;

  return {
    enter: (direction: number) => ({
      x: direction * distance,
      opacity: hiddenOpacity,
    }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({
      x: direction * -distance,
      opacity: hiddenOpacity,
    }),
  };
};

const useAnimatedOnboarding = () => {
  const searchParams = useSearchParams();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const transitionDirection = useOnboardingTransition((state) => state.direction);
  const { handleBack, isCustomInput } = useOnboarding();
  const stepIndex = getOnboardingStepIndex(searchParams.get("step"));
  const stepKey = ONBOARDING_STEPS[stepIndex];

  useOnboardingHeader(handleBack);

  return {
    animationKey: isCustomInput ? `${stepKey}-custom` : stepKey,
    slideDirection: transitionDirection === "forward" ? 1 : -1,
    slideVariants: createSlideVariants(shouldReduceMotion),
    transition: shouldReduceMotion ? { duration: 0 } : ONBOARDING_TRANSITION,
  };
};

export { useAnimatedOnboarding };
