"use client";

import { AnimatePresence, useReducedMotion, motion } from "motion/react";
import { useSearchParams } from "next/navigation";

import { useOnboarding } from "@/features/onboarding/hooks/useOnboarding";
import { useOnboardingHeader } from "@/features/onboarding/hooks/useOnboardingHeader";
import { ONBOARDING_TRANSITION, SLIDE_DISTANCE } from "@/features/onboarding/onboardingAnimation";
import { getOnboardingStepIndex, ONBOARDING_STEPS } from "@/features/onboarding/onboardingSteps";
import { useOnboardingTransition } from "@/features/onboarding/onboardingTransition.store";

import type { Variants } from "motion/react";
import type { ReactNode } from "react";

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

export default function AnimatedOnboarding({ children }: Readonly<{ children: ReactNode }>) {
  const searchParams = useSearchParams();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const transitionDirection = useOnboardingTransition((state) => state.direction);
  const { handleBack } = useOnboarding();
  const stepIndex = getOnboardingStepIndex(searchParams.get("step"));
  const slideDirection = transitionDirection === "forward" ? 1 : -1;
  const slideVariants = createSlideVariants(shouldReduceMotion);

  useOnboardingHeader(handleBack);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <AnimatePresence initial={false} custom={slideDirection}>
        <motion.div
          key={ONBOARDING_STEPS[stepIndex]}
          custom={slideDirection}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={shouldReduceMotion ? { duration: 0 } : ONBOARDING_TRANSITION}
          className="absolute inset-0"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
