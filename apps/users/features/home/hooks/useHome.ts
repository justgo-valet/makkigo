import { getErrorMessage } from "@makkigo/api-client";
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
import { useVehicles } from "@/features/vehicle/hooks/useVehicles";

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
const FALLBACK_ERROR_MESSAGE = "차량 정보를 불러오지 못했습니다.";

const STATUS_BADGES: Partial<Record<HomeStatus, StatusBadge>> = {
  ARRIVAL_SCHEDULED: { label: "도착 예정", tone: "info" },
  PARKED: { label: "주차 완료", tone: "success" },
  EXIT_REQUESTED: { label: "출차 요청", tone: "danger" },
  EXIT_PREPARING: { label: "출차 준비 중", tone: "warning" },
};

const minutesAgo = (now: number, minutes: number) => now - minutes * MINUTE_MS;

const getMetaItems = (preview: HomePreview, vehicleNumber: string, now: number) => {
  const formattedVehicleNumber = formatVehicleNumber(vehicleNumber);

  if (preview.parkedMinutesAgo !== null) {
    return [
      formattedVehicleNumber,
      `${formatClockTime(minutesAgo(now, preview.parkedMinutesAgo))} 입차`,
      `${formatElapsed(preview.parkedMinutesAgo)} 경과`,
    ];
  }

  if (preview.arrivalNotifiedMinutesAgo !== null) {
    return [
      formattedVehicleNumber,
      `${formatClockTime(minutesAgo(now, preview.arrivalNotifiedMinutesAgo))} 도착 알림`,
    ];
  }

  if (preview.status === "MERCHANT_SELECTED") {
    return [formattedVehicleNumber, "도착 알림 전"];
  }

  return [formattedVehicleNumber];
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
  const preview: HomePreview = BEFORE_SESSION_STATUSES.has(basePreview.status)
    ? {
        ...basePreview,
        status: selectedMerchant ? "MERCHANT_SELECTED" : "NONE",
        merchantName: selectedMerchant?.name ?? null,
      }
    : basePreview;
  const { data: vehicles, error, isError, isPending, refetch } = useVehicles();
  const [now] = useState(() => Date.now());
  const [isAccountCopied, setIsAccountCopied] = useState(false);
  const vehicle = vehicles?.[0];

  useEffect(() => {
    if (!isAccountCopied) return;

    const timer = setTimeout(() => setIsAccountCopied(false), COPIED_RESET_MS);

    return () => clearTimeout(timer);
  }, [isAccountCopied]);

  const copyAccountNumber = () => {
    if (!preview.accountNumber) return;

    void navigator.clipboard.writeText(preview.accountNumber).then(() => setIsAccountCopied(true));
  };

  if (isPending) return { status: "loading" } as const;

  if (isError) {
    return {
      status: "error",
      errorMessage: getErrorMessage(error, FALLBACK_ERROR_MESSAGE),
      retry: () => void refetch(),
    } as const;
  }

  if (!vehicle) {
    return {
      status: "error",
      errorMessage: "등록된 차량이 없습니다.",
      retry: () => void refetch(),
    } as const;
  }

  return {
    status: "ready" as const,
    title: preview.merchantName ?? "장소 미정",
    badge: STATUS_BADGES[preview.status] ?? null,
    metaItems: getMetaItems(preview, vehicle.plateNumber, now),
    carImageUrl: vehicle.carImageUrl,
    carImageAlt: `${formatVehicleNumber(vehicle.plateNumber)} 차량`,
    exitSummary: getExitSummary(preview, now),
    actions: getHomeActions(preview.status),
    isAccountCopied,
    copyAccountNumber,
  };
};

export { useHome };
export type { ExitSummary, StatusBadge, StatusTone };
