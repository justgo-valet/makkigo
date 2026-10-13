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
import { getBeforeSessionSnapshot, toHomeSnapshot } from "@/features/home/homeSnapshot";
import { useSelectedMerchantValue } from "@/features/merchant/hooks/useSelectedMerchantValue";
import { useCurrentSession } from "@/features/valet/hooks/useCurrentSession";
import { useVehicles } from "@/features/vehicle/hooks/useVehicles";

import type { HomeSnapshot, HomeStatus } from "@/features/home/homeSnapshot";

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
const NOW_TICK_MS = 30 * 1000;
const COPIED_RESET_MS = 2000;
const FALLBACK_ERROR_MESSAGE = "차량 정보를 불러오지 못했습니다.";
const SESSION_FALLBACK_ERROR_MESSAGE = "발렛 정보를 불러오지 못했습니다.";

const STATUS_BADGES: Partial<Record<HomeStatus, StatusBadge>> = {
  ARRIVAL_SCHEDULED: { label: "도착 예정", tone: "info" },
  PARKED: { label: "주차 완료", tone: "success" },
  EXIT_REQUESTED: { label: "출차 요청", tone: "danger" },
  EXIT_PREPARING: { label: "출차 준비 중", tone: "warning" },
};

const elapsedMinutes = (now: number, from: number) =>
  Math.max(0, Math.floor((now - from) / MINUTE_MS));

const getMetaItems = (snapshot: HomeSnapshot, vehicleNumber: string, now: number) => {
  const formattedVehicleNumber = formatVehicleNumber(vehicleNumber);

  if (snapshot.parkedAt !== null) {
    return [
      formattedVehicleNumber,
      `${formatClockTime(snapshot.parkedAt)} 입차`,
      `${formatElapsed(elapsedMinutes(now, snapshot.parkedAt))} 경과`,
    ];
  }

  if (snapshot.arrivalNotifiedAt !== null) {
    const delayMinutes = snapshot.arrivalDelayMinutes ?? 0;

    return [
      formattedVehicleNumber,
      `${formatClockTime(snapshot.arrivalNotifiedAt)} 도착 알림`,
      ...(delayMinutes > 0 ? [`${formatElapsed(delayMinutes)} 지연`] : []),
    ];
  }

  if (snapshot.status === "MERCHANT_SELECTED") {
    return [formattedVehicleNumber, "도착 알림 전"];
  }

  return [formattedVehicleNumber];
};

const getExitSummary = (snapshot: HomeSnapshot): ExitSummary | null => {
  switch (snapshot.status) {
    case "PARKED":
      return {
        headline: "현재 출차 요청",
        emphasis: `${snapshot.waitingExitCount ?? 0}대`,
        note: "요원님 확인 후 시각 안내",
        feeLabel: "지금 출차 시 요금",
        fee: formatWon(snapshot.currentFee ?? 0),
        canSeeFeeDetail: true,
        accountNumber: null,
      };
    case "EXIT_REQUESTED":
      return {
        headline: "출차 요청을 보냈어요",
        emphasis: null,
        note: "요원님 확인 후 시각 안내",
        feeLabel: "기준 요금",
        fee: formatWon(snapshot.currentFee ?? 0),
        canSeeFeeDetail: true,
        accountNumber: null,
      };
    case "EXIT_PREPARING":
      return {
        headline: "출차 예정",
        emphasis:
          snapshot.expectedExitAt === null ? null : formatClockTime(snapshot.expectedExitAt),
        note: "요원님이 차량을 준비하고 있어요",
        feeLabel: "발렛 요금",
        fee: formatWon(snapshot.actualFee ?? snapshot.currentFee ?? 0),
        canSeeFeeDetail: false,
        accountNumber: snapshot.accountNumber,
      };
    default:
      return null;
  }
};

const useNow = () => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), NOW_TICK_MS);

    return () => clearInterval(timer);
  }, []);

  return now;
};

const useHome = () => {
  const searchParams = useSearchParams();
  const now = useNow();
  const selectedMerchant = useSelectedMerchantValue();
  const vehiclesQuery = useVehicles();
  const sessionQuery = useCurrentSession();
  const [isAccountCopied, setIsAccountCopied] = useState(false);
  const vehicle = vehiclesQuery.data?.[0];
  const session = sessionQuery.data?.session ?? null;
  const snapshot =
    getHomePreview(searchParams.get(PREVIEW_PARAM), now) ??
    (session ? toHomeSnapshot(session) : getBeforeSessionSnapshot(selectedMerchant?.name ?? null));

  useEffect(() => {
    if (!isAccountCopied) return;

    const timer = setTimeout(() => setIsAccountCopied(false), COPIED_RESET_MS);

    return () => clearTimeout(timer);
  }, [isAccountCopied]);

  const copyAccountNumber = () => {
    if (!snapshot.accountNumber) return;

    void navigator.clipboard.writeText(snapshot.accountNumber).then(() => setIsAccountCopied(true));
  };

  if (vehiclesQuery.isPending || sessionQuery.isPending) return { status: "loading" } as const;

  if (vehiclesQuery.isError) {
    return {
      status: "error",
      errorMessage: getErrorMessage(vehiclesQuery.error, FALLBACK_ERROR_MESSAGE),
      retry: () => void vehiclesQuery.refetch(),
    } as const;
  }

  if (sessionQuery.isError) {
    return {
      status: "error",
      errorMessage: getErrorMessage(sessionQuery.error, SESSION_FALLBACK_ERROR_MESSAGE),
      retry: () => void sessionQuery.refetch(),
    } as const;
  }

  if (!vehicle) {
    return {
      status: "error",
      errorMessage: "등록된 차량이 없습니다.",
      retry: () => void vehiclesQuery.refetch(),
    } as const;
  }

  return {
    status: "ready" as const,
    title: snapshot.merchantName ?? "장소 미정",
    badge: STATUS_BADGES[snapshot.status] ?? null,
    metaItems: getMetaItems(snapshot, snapshot.plateNumber ?? vehicle.plateNumber, now),
    carImageUrl: vehicle.carImageUrl,
    carImageAlt: `${formatVehicleNumber(vehicle.plateNumber)} 차량`,
    exitSummary: getExitSummary(snapshot),
    actions: getHomeActions(snapshot.status),
    isAccountCopied,
    copyAccountNumber,
  };
};

export { useHome };
export type { ExitSummary, StatusBadge, StatusTone };
