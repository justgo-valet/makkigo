import type { BankTransferAccount } from "@/features/valet/bankApps";
import type { CurrentSession, CurrentSessionStatus } from "@/libs/valet/contracts/currentSession";

type HomeStatus =
  | "NONE"
  | "MERCHANT_SELECTED"
  | "ARRIVAL_SCHEDULED"
  | "PARKED"
  | "EXIT_REQUESTED"
  | "EXIT_PREPARING";

interface HomeSnapshot {
  status: HomeStatus;
  hasTicket: boolean;
  merchantName: string | null;
  plateNumber: string | null;
  arrivalNotifiedAt: number | null;
  arrivalDelayMinutes: number | null;
  parkedAt: number | null;
  waitingExitCount: number | null;
  currentFee: number | null;
  actualFee: number | null;
  expectedExitAt: number | null;
  bankAccount: BankTransferAccount | null;
}

const HOME_STATUS_BY_SESSION_STATUS: Record<CurrentSessionStatus, HomeStatus> = {
  ARRIVING: "ARRIVAL_SCHEDULED",
  PARKED: "PARKED",
  PICKUP_REQUESTED: "EXIT_REQUESTED",
  PICKUP_PREPARING: "EXIT_PREPARING",
};

const toTime = (value: string | null) => (value ? Date.parse(value) : null);

const getBeforeSessionSnapshot = (merchantName: string | null): HomeSnapshot => ({
  status: merchantName ? "MERCHANT_SELECTED" : "NONE",
  hasTicket: false,
  merchantName,
  plateNumber: null,
  arrivalNotifiedAt: null,
  arrivalDelayMinutes: null,
  parkedAt: null,
  waitingExitCount: null,
  currentFee: null,
  actualFee: null,
  expectedExitAt: null,
  bankAccount: null,
});

const toHomeSnapshot = (session: CurrentSession): HomeSnapshot => ({
  status: HOME_STATUS_BY_SESSION_STATUS[session.status],
  hasTicket: session.hasTicket,
  merchantName: session.merchantName ?? session.boothName,
  plateNumber: session.plateNumber,
  arrivalNotifiedAt: toTime(session.arrivalNotifiedAt),
  arrivalDelayMinutes: session.arrivalDelayMinutes,
  parkedAt: toTime(session.parkedAt),
  waitingExitCount: session.waitingPickupCount,
  currentFee: session.fee?.total ?? null,
  actualFee: session.actualFee,
  expectedExitAt: toTime(session.expectedPickupAt),
  bankAccount: session.bankAccount && {
    bankName: session.bankAccount.bankName,
    accountNumber: session.bankAccount.accountNumber,
  },
});

export { getBeforeSessionSnapshot, toHomeSnapshot };
export type { HomeSnapshot, HomeStatus };
