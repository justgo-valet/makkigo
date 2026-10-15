import { cn } from "@makkigo/ui";
import Link from "next/link";

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
  return (
    <nav
      className={cn(
        "flex items-center justify-center gap-6 text-[#575757] underline",
        className,
        "leading-[1.15]",
      )}
    >
      {canReturnToPending && (
        <button type="button" className="underline" onClick={onShowPending}>
          요청 현황 보기
        </button>
      )}
      <Link href="/booths/new">부스 등록하러 가기</Link>
    </nav>
  );
}
