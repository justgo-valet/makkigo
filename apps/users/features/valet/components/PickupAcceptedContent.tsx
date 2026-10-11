import { Button } from "@makkigo/ui";
import Image from "next/image";

import ValetFeeBreakdown from "@/features/valet/components/ValetFeeBreakdown";

import type { ValetFeeView } from "@/features/valet/valetFeeFormat";

interface PickupAcceptedContentProps {
  pickupTimeLabel: string;
  fee: ValetFeeView | null;
  isFeeExpanded: boolean;
  accountLabel: string | null;
  isAccountCopied: boolean;
  onToggleFee: () => void;
  onCopyAccountNumber: () => void;
}

export default function PickupAcceptedContent({
  pickupTimeLabel,
  fee,
  isFeeExpanded,
  accountLabel,
  isAccountCopied,
  onToggleFee,
  onCopyAccountNumber,
}: Readonly<PickupAcceptedContentProps>) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border px-4 py-4 text-center font-bold text-(--base-color)">
        {pickupTimeLabel}
      </div>

      <div className="rounded-xl border px-4">
        {fee ? (
          <button
            type="button"
            aria-expanded={isFeeExpanded}
            className="flex w-full items-center justify-between gap-3 py-4"
            onClick={onToggleFee}
          >
            <span
              className={isFeeExpanded ? "font-bold text-(--base-color)" : "text-(--base-color)"}
            >
              발렛 요금
            </span>
            <span className="flex items-center gap-1">
              <span className="text-lg font-bold text-(--base-color)">{fee.total}</span>
              <Image
                src="/icons/chevron_right.svg"
                alt=""
                aria-hidden="true"
                width={20}
                height={20}
                className={isFeeExpanded ? "-rotate-90" : ""}
              />
            </span>
          </button>
        ) : (
          <div className="flex items-center justify-between gap-3 py-4">
            <span className="text-(--base-color)">발렛 요금</span>
            <span className="text-right text-sm text-(--tertiary-color)">요원님이 안내해요</span>
          </div>
        )}
        {fee && isFeeExpanded && (
          <div className="border-t pt-2 pb-2">
            <ValetFeeBreakdown fee={fee} size="compact" />
          </div>
        )}
      </div>

      {accountLabel && (
        <div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
          <p className="min-w-0 text-sm break-all text-(--base-color)">
            <span className="mr-1.5">계좌번호</span>
            {accountLabel}
          </p>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="shrink-0 px-0"
            onClick={onCopyAccountNumber}
          >
            {isAccountCopied ? "복사됨" : "복사"}
          </Button>
        </div>
      )}
    </div>
  );
}
