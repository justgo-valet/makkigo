import type { Toast } from "../hooks/useOnboardingFlow";

interface OnboardingToastProps {
  toast: Toast | null;
}

export default function OnboardingToast({ toast }: Readonly<OnboardingToastProps>) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(139px+var(--safe-area-inset-bottom))] z-20 flex justify-center px-6"
    >
      {toast && (
        <p
          key={toast.id}
          className="w-full max-w-xs animate-in rounded-xl border bg-white px-4 py-2 text-center text-sm text-(--base-color) shadow-md duration-200 fade-in slide-in-from-bottom-2"
        >
          {toast.message}
        </p>
      )}
    </div>
  );
}
