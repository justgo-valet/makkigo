"use client";

import { AnimatePresence, motion } from "motion/react";

import { useAnimatedOnboarding } from "@/features/onboarding/hooks/useAnimatedOnboarding";

import type { ReactNode } from "react";

export default function AnimatedOnboarding({ children }: Readonly<{ children: ReactNode }>) {
  const { animationKey, slideDirection, slideVariants, transition } = useAnimatedOnboarding();

  return (
    <div className="relative w-full h-full overflow-hidden">
      <AnimatePresence initial={false} custom={slideDirection}>
        <motion.div
          key={animationKey}
          custom={slideDirection}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
          className="absolute inset-0"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
