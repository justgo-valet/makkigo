import { create } from "zustand";

type OnboardingTransitionDirection = "forward" | "backward";

interface OnboardingTransitionState {
  direction: OnboardingTransitionDirection;
  setDirection: (direction: OnboardingTransitionDirection) => void;
}

const useOnboardingTransition = create<OnboardingTransitionState>()((set) => ({
  direction: "forward",
  setDirection: (direction) => set({ direction }),
}));

export { useOnboardingTransition };
