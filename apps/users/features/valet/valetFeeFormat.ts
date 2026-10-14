import { formatElapsed, formatWon } from "@/features/home/homeFormat";

import type { ValetFee } from "@/libs/valet/contracts/currentSession";

interface ValetFeeLine {
  label: string;
  detail: string;
  amount: string;
}

interface ValetFeeView {
  lines: ValetFeeLine[];
  total: string;
}

const toValetFeeView = (fee: ValetFee): ValetFeeView => ({
  lines: [
    {
      label: "기본 요금",
      detail: `${formatElapsed(fee.baseMinutes)}까지`,
      amount: formatWon(fee.baseFee),
    },
    {
      label: "추가 요금",
      detail: `${formatElapsed(fee.extraUnits * fee.extraUnitMinutes)} × ${formatElapsed(fee.extraUnitMinutes)}당 ${formatWon(fee.extraUnitFee)}`,
      amount: formatWon(fee.extraFee),
    },
  ],
  total: formatWon(fee.total),
});

export { toValetFeeView };
export type { ValetFeeLine, ValetFeeView };
