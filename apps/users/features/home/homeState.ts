import type { CurrentValetSession } from "@/libs/valet/contracts/currentSession";

type HomeStatus =
  | "NONE"
  | "MERCHANT_SELECTED"
  | "ARRIVAL_SCHEDULED"
  | "PARKED"
  | "EXIT_REQUESTED"
  | "EXIT_PREPARING";

interface HomeState {
  status: HomeStatus;
  sessionId: number | null;
  merchantName: string | null;
  arrivalNotifiedAt: number | null;
  parkedAt: number | null;
  waitingExitCount: number | null;
  currentFee: number | null;
  expectedExitAt: number | null;
  actualFee: number | null;
  accountNumber: string | null;
}

const SESSION_HOME_STATUSES: Record<CurrentValetSession["status"], HomeStatus> = {
  ARRIVING: "ARRIVAL_SCHEDULED",
  PARKED: "PARKED",
  PICKUP_REQUESTED: "EXIT_REQUESTED",
  PICKUP_PREPARING: "EXIT_PREPARING",
};

const toTime = (value: string | null) => (value ? new Date(value).getTime() : null);

const toHomeState = (
  session: CurrentValetSession | null,
  selectedMerchantName: string | null,
): HomeState => {
  if (!session) {
    return {
      status: selectedMerchantName ? "MERCHANT_SELECTED" : "NONE",
      sessionId: null,
      merchantName: selectedMerchantName,
      arrivalNotifiedAt: null,
      parkedAt: null,
      waitingExitCount: null,
      currentFee: null,
      expectedExitAt: null,
      actualFee: null,
      accountNumber: null,
    };
  }

  return {
    status: SESSION_HOME_STATUSES[session.status],
    sessionId: session.id,
    merchantName: session.merchantName,
    arrivalNotifiedAt: toTime(session.arrivalNotifiedAt),
    parkedAt: toTime(session.parkedAt),
    waitingExitCount: session.waitingPickupCount,
    currentFee: session.currentFee,
    expectedExitAt: toTime(session.expectedPickupAt),
    actualFee: session.actualFee,
    accountNumber: session.bankAccount,
  };
};

export { toHomeState };
export type { HomeState, HomeStatus };
