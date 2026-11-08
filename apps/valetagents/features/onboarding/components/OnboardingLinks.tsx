import { cn } from "@makkigo/ui";

interface OnboardingLinksProps {
  canReturnToPending: boolean;
  onShowPending: () => void;
  className?: string;
}

export default function OnboardingLinks({
  canReturnToPending,
  onShowPending,
  className,
}: Readonly<OnboardingLinksProps>) {
  if (!canReturnToPending) return null;

  return (
    <nav
      className={cn(
        "flex items-center justify-center gap-6 text-(--tertiary-color) underline",
        className,
        "leading-[1.15]",
      )}
    >
      <button type="button" className="underline" onClick={onShowPending}>
        요청 현황 보기
      </button>
    </nav>
  );
}
