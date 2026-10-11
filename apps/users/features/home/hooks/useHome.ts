import { getErrorMessage } from "@makkigo/api-client";
import { useEffect, useState } from "react";

import { getHomeActions } from "@/features/home/homeActions";
import {
  formatClockTime,
  formatElapsed,
  formatVehicleNumber,
  formatWon,
} from "@/features/home/homeFormat";
import { toHomeState } from "@/features/home/homeState";
import { useSelectedMerchantValue } from "@/features/merchant/hooks/useSelectedMerchantValue";
import { useCurrentValetSession } from "@/features/valet/hooks/useCurrentValetSession";
import { useVehicles } from "@/features/vehicle/hooks/useVehicles";

import type { HomeState, HomeStatus } from "@/features/home/homeState";

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

const MINUTE_MS = 60 * 1000;
const COPIED_RESET_MS = 2000;
const FALLBACK_ERROR_MESSAGE = "차량 정보를 불러오지 못했습니다.";
const SESSION_FALLBACK_ERROR_MESSAGE = "발렛 진행 상황을 불러오지 못했습니다.";

const STATUS_BADGES: Partial<Record<HomeStatus, StatusBadge>> = {
  ARRIVAL_SCHEDULED: { label: "도착 예정", tone: "info" },
  PARKED: { label: "주차 완료", tone: "success" },
  EXIT_REQUESTED: { label: "출차 요청", tone: "danger" },
  EXIT_PREPARING: { label: "출차 준비 중", tone: "warning" },
};

const elapsedMinutes = (now: number, time: number) =>
  Math.max(0, Math.floor((now - time) / MINUTE_MS));

const getMetaItems = (home: HomeState, vehicleNumber: string, now: number) => {
  const formattedVehicleNumber = formatVehicleNumber(vehicleNumber);

  if (home.parkedAt !== null) {
    return [
      formattedVehicleNumber,
      `${formatClockTime(home.parkedAt)} 입차`,
      `${formatElapsed(elapsedMinutes(now, home.parkedAt))} 경과`,
    ];
  }

  if (home.arrivalNotifiedAt !== null) {
    return [formattedVehicleNumber, `${formatClockTime(home.arrivalNotifiedAt)} 도착 알림`];
  }

  if (home.status === "MERCHANT_SELECTED") {
    return [formattedVehicleNumber, "도착 알림 전"];
  }

  return [formattedVehicleNumber];
};

const getExitSummary = (home: HomeState): ExitSummary | null => {
  switch (home.status) {
    case "PARKED":
      return {
        headline: "현재 출차 요청",
        emphasis: `${home.waitingExitCount ?? 0}대`,
        note: "요원님 확인 후 시각 안내",
        feeLabel: "지금 출차 시 요금",
        fee: home.currentFee === null ? "-" : formatWon(home.currentFee),
        canSeeFeeDetail: true,
        accountNumber: null,
      };
    case "EXIT_REQUESTED":
      return {
        headline: "출차 요청을 보냈어요",
        emphasis: null,
        note: "요원님 확인 후 시각 안내",
        feeLabel: "기준 요금",
        fee: home.currentFee === null ? "-" : formatWon(home.currentFee),
        canSeeFeeDetail: true,
        accountNumber: null,
      };
    case "EXIT_PREPARING":
      return {
        headline: "출차 예정",
        emphasis: home.expectedExitAt === null ? null : formatClockTime(home.expectedExitAt),
        note: "요원님이 차량을 준비하고 있어요",
        feeLabel: "발렛 요금",
        fee: home.actualFee === null ? "-" : formatWon(home.actualFee),
        canSeeFeeDetail: false,
        accountNumber: home.accountNumber,
      };
    default:
      return null;
  }
};

const useHome = () => {
  const selectedMerchant = useSelectedMerchantValue();
  const { data: vehicles, error, isError, isPending, refetch } = useVehicles();
  const currentSession = useCurrentValetSession();
  const now = currentSession.dataUpdatedAt;
  const home = toHomeState(currentSession.data?.session ?? null, selectedMerchant?.name ?? null);
  const [isAccountCopied, setIsAccountCopied] = useState(false);
  const vehicle = vehicles?.[0];

  useEffect(() => {
    if (!isAccountCopied) return;

    const timer = setTimeout(() => setIsAccountCopied(false), COPIED_RESET_MS);

    return () => clearTimeout(timer);
  }, [isAccountCopied]);

  const copyAccountNumber = () => {
    if (!home.accountNumber) return;

    void navigator.clipboard.writeText(home.accountNumber).then(() => setIsAccountCopied(true));
  };

  if (isPending || currentSession.isPending) return { status: "loading" } as const;

  if (currentSession.isError) {
    return {
      status: "error",
      errorMessage: getErrorMessage(currentSession.error, SESSION_FALLBACK_ERROR_MESSAGE),
      retry: () => void currentSession.refetch(),
    } as const;
  }

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
    title: home.merchantName ?? "장소 미정",
    badge: STATUS_BADGES[home.status] ?? null,
    metaItems: getMetaItems(home, vehicle.plateNumber, now),
    carImageUrl: vehicle.carImageUrl,
    carImageAlt: `${formatVehicleNumber(vehicle.plateNumber)} 차량`,
    exitSummary: getExitSummary(home),
    actions: getHomeActions(home.status),
    sessionId: home.sessionId,
    isAccountCopied,
    copyAccountNumber,
  };
};

export { useHome };
export type { ExitSummary, StatusBadge, StatusTone };
