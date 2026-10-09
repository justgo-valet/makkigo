import { Button, Separator } from "@makkigo/ui";
import Image from "next/image";

import type { ExitSummary } from "@/features/home/hooks/useHome";

interface ExitSummaryCardProps {
  summary: ExitSummary;
  isAccountCopied: boolean;
  onCopyAccountNumber: () => void;
}

export default function ExitSummaryCard({
  summary,
  isAccountCopied,
  onCopyAccountNumber,
}: Readonly<ExitSummaryCardProps>) {
  return (
    <div className="flex flex-col rounded-xl border bg-(--surface-color) px-4">
      <div className="flex items-center justify-between gap-3 py-4">
        <p className="font-bold text-(--base-color)">
          {summary.headline}
          {summary.emphasis && <span className="ml-1.5 text-primary">{summary.emphasis}</span>}
        </p>
        <p className="text-right text-sm text-(--tertiary-color)">{summary.note}</p>
      </div>
      <Separator />
      <div className="flex items-center justify-between py-4">
        <p className="text-(--tertiary-color)">{summary.feeLabel}</p>
        <div className="flex items-center gap-1">
          <p className="text-lg font-bold text-(--base-color)">{summary.fee}</p>
          {summary.canSeeFeeDetail && (
            <Image
              src="/icons/chevron_right.svg"
              alt=""
              aria-hidden="true"
              width={20}
              height={20}
            />
          )}
        </div>
      </div>
      {summary.accountNumber && (
        <>
          <Separator />
          <div className="flex items-center justify-between py-3">
            <p className="text-sm text-(--base-color)">{summary.accountNumber}</p>
            <Button variant="link" size="sm" className="px-0" onClick={onCopyAccountNumber}>
              {isAccountCopied ? "복사됨" : "복사"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
