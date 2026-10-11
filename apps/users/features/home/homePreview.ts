type HomeStatus =
  | "NONE"
  | "MERCHANT_SELECTED"
  | "ARRIVAL_SCHEDULED"
  | "PARKED"
  | "EXIT_REQUESTED"
  | "EXIT_PREPARING";

interface HomePreview {
  status: HomeStatus;
  merchantName: string | null;
  arrivalNotifiedMinutesAgo: number | null;
  parkedMinutesAgo: number | null;
  waitingExitCount: number | null;
  currentFee: number | null;
  expectedExitInMinutes: number | null;
  actualFee: number | null;
  accountNumber: string | null;
}

const PREVIEW_PARAM = "preview";

const BASE_PREVIEW = {
  merchantName: null,
  arrivalNotifiedMinutesAgo: null,
  parkedMinutesAgo: null,
  waitingExitCount: null,
  currentFee: null,
  expectedExitInMinutes: null,
  actualFee: null,
  accountNumber: null,
} satisfies Omit<HomePreview, "status">;

const HOME_PREVIEWS: Record<HomeStatus, HomePreview> = {
  NONE: { ...BASE_PREVIEW, status: "NONE" },
  MERCHANT_SELECTED: {
    ...BASE_PREVIEW,
    status: "MERCHANT_SELECTED",
    merchantName: "그랜드 하얏트 서울",
  },
  ARRIVAL_SCHEDULED: {
    ...BASE_PREVIEW,
    status: "ARRIVAL_SCHEDULED",
    merchantName: "그랜드 하얏트 서울",
    arrivalNotifiedMinutesAgo: 4,
  },
  PARKED: {
    ...BASE_PREVIEW,
    status: "PARKED",
    merchantName: "그랜드 하얏트 서울",
    parkedMinutesAgo: 23,
    waitingExitCount: 6,
    currentFee: 12000,
  },
  EXIT_REQUESTED: {
    ...BASE_PREVIEW,
    status: "EXIT_REQUESTED",
    merchantName: "그랜드 하얏트 서울",
    parkedMinutesAgo: 72,
    waitingExitCount: 6,
    currentFee: 17000,
  },
  EXIT_PREPARING: {
    ...BASE_PREVIEW,
    status: "EXIT_PREPARING",
    merchantName: "그랜드 하얏트 서울",
    parkedMinutesAgo: 75,
    expectedExitInMinutes: 12,
    actualFee: 15000,
    accountNumber: "국민 123-456-789012",
  },
};

const PREVIEW_KEYS: Record<string, HomeStatus> = {
  none: "NONE",
  merchant: "MERCHANT_SELECTED",
  arrival: "ARRIVAL_SCHEDULED",
  parked: "PARKED",
  requested: "EXIT_REQUESTED",
  preparing: "EXIT_PREPARING",
};

const getHomePreview = (key: string | null) =>
  HOME_PREVIEWS[(key && PREVIEW_KEYS[key]) || "PARKED"];

export { getHomePreview, PREVIEW_PARAM };
export type { HomePreview, HomeStatus };
