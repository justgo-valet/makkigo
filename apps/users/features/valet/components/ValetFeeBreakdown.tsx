import { Separator } from "@makkigo/ui";

import type { ValetFeeView } from "@/features/valet/valetFeeFormat";

interface ValetFeeBreakdownProps {
  fee: ValetFeeView;
  size?: "default" | "compact";
}

export default function ValetFeeBreakdown({
  fee,
  size = "default",
}: Readonly<ValetFeeBreakdownProps>) {
  const isCompact = size === "compact";

  return (
    <div className="flex flex-col">
      {fee.lines.map((line) => (
        <div key={line.label} className="flex flex-col">
          <div
            className={`flex items-center justify-between gap-3 ${isCompact ? "py-1.5 text-sm" : "py-3.5"}`}
          >
            <p className="min-w-0 break-keep text-(--tertiary-color)">
              {line.label}
              <span className="ml-1.5 text-sm text-(--tertiary-color)">({line.detail})</span>
            </p>
            <p
              className={`shrink-0 ${isCompact ? "text-(--tertiary-color)" : "text-(--base-color)"}`}
            >
              {line.amount}
            </p>
          </div>
          {!isCompact && <Separator />}
        </div>
      ))}
      {isCompact ? (
        <Separator className="my-1.5" />
      ) : (
        <Separator className="-mt-px h-0.5 bg-(--base-color)" />
      )}
      <div className={`flex items-center justify-between ${isCompact ? "py-1.5" : "py-4"}`}>
        <p className="font-bold text-(--base-color)">합계</p>
        <p className={`font-bold text-(--base-color) ${isCompact ? "" : "text-2xl"}`}>
          {fee.total}
        </p>
      </div>
    </div>
  );
}
