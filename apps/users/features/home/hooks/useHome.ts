import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getHomeActions } from "@/features/home/homeActions";
import {
  formatClockTime,
  formatElapsed,
  formatVehicleNumber,
  formatWon,
} from "@/features/home/homeFormat";
import { getHomePreview, PREVIEW_PARAM } from "@/features/home/homePreview";
import { useSelectedMerchantValue } from "@/features/merchant/hooks/useSelectedMerchantValue";
import { useMyVehicle } from "@/features/user/hooks/useMyVehicle";

import type { HomePreview, HomeStatus } from "@/features/home/homePreview";

type StatusTone = "info" | "success" | "danger" | "warning";

interface StatusBadge {
  label: string;
  tone: StatusTone;
}

interface ExitSummary {
  headline: string;
  emphasis: string | null;
  note: string;
  feeLabel: string;
  fee: string;
  canSeeFeeDetail: boolean;
  accountNumber: string | null;
}

const BEFORE_SESSION_STATUSES = new Set<HomeStatus>(["NONE", "MERCHANT_SELECTED"]);

const MINUTE_MS = 60 * 1000;
const COPIED_RESET_MS = 2000;

const STATUS_BADGES: Partial<Record<HomeStatus, StatusBadge>> = {
  ARRIVAL_SCHEDULED: { label: "도착 예정", tone: "info" },
  PARKED: { label: "주차 완료", tone: "success" },
  EXIT_REQUESTED: { label: "출차 요청", tone: "danger" },
  EXIT_PREPARING: { label: "출차 준비 중", tone: "warning" },
};

const minutesAgo = (now: number, minutes: number) => now - minutes * MINUTE_MS;

const getStatusMetaItems = (preview: HomePreview, now: number) => {
  if (preview.parkedMinutesAgo !== null) {
    return [
      `${formatClockTime(minutesAgo(now, preview.parkedMinutesAgo))} 입차`,
      `${formatElapsed(preview.parkedMinutesAgo)} 경과`,
    ];
  }

  if (preview.arrivalNotifiedMinutesAgo !== null) {
    return [`${formatClockTime(minutesAgo(now, preview.arrivalNotifiedMinutesAgo))} 도착 알림`];
  }

  if (preview.status === "MERCHANT_SELECTED") return ["도착 알림 전"];

  return [];
};

const getMetaItems = (preview: HomePreview, vehicleNumber: string | null, now: number) => {
  const items = getStatusMetaItems(preview, now);

  return vehicleNumber ? [vehicleNumber, ...items] : items;
};

const getExitSummary = (preview: HomePreview, now: number): ExitSummary | null => {
  switch (preview.status) {
    case "PARKED":
      return {
        headline: "현재 출차 요청",
        emphasis: `${preview.waitingExitCount ?? 0}대`,
        note: "요원님 확인 후 시각 안내",
        feeLabel: "지금 출차 시 요금",
        fee: formatWon(preview.currentFee ?? 0),
        canSeeFeeDetail: true,
        accountNumber: null,
      };
    case "EXIT_REQUESTED":
      return {
        headline: "출차 요청을 보냈어요",
        emphasis: null,
        note: "요원님 확인 후 시각 안내",
        feeLabel: "기준 요금",
        fee: formatWon(preview.currentFee ?? 0),
        canSeeFeeDetail: true,
        accountNumber: null,
      };
    case "EXIT_PREPARING":
      return {
        headline: "출차 예정",
        emphasis: formatClockTime(now + (preview.expectedExitInMinutes ?? 0) * MINUTE_MS),
        note: "요원님이 차량을 준비하고 있어요",
        feeLabel: "발렛 요금",
        fee: formatWon(preview.actualFee ?? 0),
        canSeeFeeDetail: false,
        accountNumber: preview.accountNumber,
      };
    default:
      return null;
  }
};

const useHome = () => {
  const searchParams = useSearchParams();
  const basePreview = getHomePreview(searchParams.get(PREVIEW_PARAM));
  const selectedMerchant = useSelectedMerchantValue();
  const { data: vehicle } = useMyVehicle();
  const vehicleNumber = vehicle ? formatVehicleNumber(vehicle.plateNumber) : null;
  const preview: HomePreview = BEFORE_SESSION_STATUSES.has(basePreview.status)
    ? {
        ...basePreview,
        status: selectedMerchant ? "MERCHANT_SELECTED" : "NONE",
        merchantName: selectedMerchant?.name ?? null,
      }
    : basePreview;
  const [now] = useState(() => Date.now());
  const [isAccountCopied, setIsAccountCopied] = useState(false);

  useEffect(() => {
    if (!isAccountCopied) return;

    const timer = setTimeout(() => setIsAccountCopied(false), COPIED_RESET_MS);

    return () => clearTimeout(timer);
  }, [isAccountCopied]);

  const copyAccountNumber = () => {
    if (!preview.accountNumber) return;

    void navigator.clipboard.writeText(preview.accountNumber).then(() => setIsAccountCopied(true));
  };

  return {
    title: preview.merchantName ?? "장소 미정",
    badge: STATUS_BADGES[preview.status] ?? null,
    metaItems: getMetaItems(preview, vehicleNumber, now),
    carImageUrl: vehicle?.carImageUrl ?? null,
    carImageAlt: vehicleNumber ? `${vehicleNumber} 차량` : "내 차량",
    exitSummary: getExitSummary(preview, now),
    actions: getHomeActions(preview.status),
    isAccountCopied,
    copyAccountNumber,
  };
};

export { useHome };
export type { ExitSummary, StatusBadge, StatusTone };
