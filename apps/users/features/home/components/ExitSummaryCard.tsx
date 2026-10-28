import { Separator } from "@makkigo/ui";
import Image from "next/image";

import BankTransferButton from "@/features/valet/components/BankTransferButton";

import type { ExitSummary } from "@/features/home/hooks/useHome";
import type { BankTransfer } from "@/features/valet/hooks/useBankTransfer";

interface ExitSummaryCardProps {
  summary: ExitSummary;
  transfer: BankTransfer;
  onFeeDetailClick: () => void;
}

export default function ExitSummaryCard({
  summary,
  transfer,
  onFeeDetailClick,
}: Readonly<ExitSummaryCardProps>) {
  return (
    <div className="flex flex-col rounded-xl border bg-white px-4">
      <div className="flex items-center justify-between gap-3 py-4">
        <p className="shrink-0 font-bold whitespace-nowrap text-(--base-color)">
          {summary.headline}
          {summary.emphasis && <span className="ml-1.5 text-primary">{summary.emphasis}</span>}
        </p>
        <p className="min-w-0 text-right text-sm break-keep text-(--tertiary-color)">
          {summary.note}
        </p>
      </div>
      <Separator />
      <button
        type="button"
        disabled={!summary.canSeeFeeDetail}
        className="flex items-center justify-between py-4 text-left"
        onClick={onFeeDetailClick}
      >
        <span className="text-(--tertiary-color)">{summary.feeLabel}</span>
        <span className="flex items-center gap-1">
          <span className="text-lg font-bold text-(--base-color)">{summary.fee}</span>
          {summary.canSeeFeeDetail && (
            <Image
              src="/icons/chevron_right.svg"
              alt=""
              aria-hidden="true"
              width={20}
              height={20}
            />
          )}
        </span>
      </button>
      {summary.accountLabel && (
        <>
          <Separator />
          <div className="flex items-center justify-between gap-3 py-3">
            <p className="min-w-0 text-sm break-all text-(--base-color)">{summary.accountLabel}</p>
            <BankTransferButton transfer={transfer} />
          </div>
        </>
      )}
    </div>
  );
}
