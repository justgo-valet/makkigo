import { getBeforeSessionSnapshot } from "@/features/home/homeSnapshot";

import type { HomeSnapshot, HomeStatus } from "@/features/home/homeSnapshot";

const PREVIEW_PARAM = "preview";
const MINUTE_MS = 60 * 1000;
const PREVIEW_MERCHANT_NAME = "그랜드 하얏트 서울";

const PREVIEW_KEYS: Record<string, HomeStatus> = {
  none: "NONE",
  merchant: "MERCHANT_SELECTED",
  arrival: "ARRIVAL_SCHEDULED",
  parked: "PARKED",
  requested: "EXIT_REQUESTED",
  preparing: "EXIT_PREPARING",
};

const createPreviews = (now: number): Record<HomeStatus, HomeSnapshot> => {
  const minutesAgo = (minutes: number) => now - minutes * MINUTE_MS;
  const base = getBeforeSessionSnapshot(PREVIEW_MERCHANT_NAME);

  return {
    NONE: getBeforeSessionSnapshot(null),
    MERCHANT_SELECTED: base,
    ARRIVAL_SCHEDULED: {
      ...base,
      status: "ARRIVAL_SCHEDULED",
      expectedArrivalAt: now + 11 * MINUTE_MS,
    },
    PARKED: {
      ...base,
      status: "PARKED",
      parkedAt: minutesAgo(23),
      waitingExitCount: 6,
      currentFee: 12000,
    },
    EXIT_REQUESTED: {
      ...base,
      status: "EXIT_REQUESTED",
      parkedAt: minutesAgo(72),
      waitingExitCount: 6,
      currentFee: 17000,
    },
    EXIT_PREPARING: {
      ...base,
      status: "EXIT_PREPARING",
      parkedAt: minutesAgo(75),
      expectedExitAt: now + 12 * MINUTE_MS,
      actualFee: 15000,
      bankAccount: { bankName: "국민", accountNumber: "123-456-789012" },
    },
  };
};

const getHomePreview = (key: string | null, now: number) => {
  if (process.env.NODE_ENV === "production" || !key || !PREVIEW_KEYS[key]) return null;

  return createPreviews(now)[PREVIEW_KEYS[key]];
};

export { getHomePreview, PREVIEW_PARAM };
