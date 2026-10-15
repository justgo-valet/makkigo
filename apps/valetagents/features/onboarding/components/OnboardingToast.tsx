import type { Toast } from "../hooks/useOnboardingFlow";

interface OnboardingToastProps {
  toast: Toast | null;
}

export default function OnboardingToast({ toast }: Readonly<OnboardingToastProps>) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(139px+env(safe-area-inset-bottom))] z-20 flex justify-center px-6"
    >
      {toast && (
        <p
          key={toast.id}
          className="w-full max-w-[304px] animate-in rounded-lg bg-[#dfe9f5] px-3 py-2 text-center text-xs leading-6 text-(--base-color) shadow-[0_2px_8px_rgba(0,0,0,0.12)] duration-200 fade-in slide-in-from-bottom-2"
        >
          {toast.message}
        </p>
      )}
    </div>
  );
}
