import type { BoothValetSession, ValetFee } from "./schemas/sessions";

const MINUTE_MS = 60_000;

const formatPlateNumber = (plateNumber: string) => plateNumber.replace(/(\d{4})$/, " $1");

const minutesBetween = (from: number, to: number) => Math.ceil((to - from) / MINUTE_MS);

const minutesSince = (iso: string, now: number) =>
  Math.max(0, Math.floor((now - Date.parse(iso)) / MINUTE_MS));

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  if (hours === 0) return `${minutes}분`;
  return minutes % 60 === 0 ? `${hours}시간` : `${hours}시간 ${minutes % 60}분`;
};

const formatWon = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

const formatFeeBreakdown = (fee: ValetFee) =>
  `기본 요금 ${formatWon(fee.baseFee)}(${formatDuration(fee.baseMinutes)}) + 추가 요금 ${formatWon(fee.extraFee)}`;

const formatSessionLabel = (session: BoothValetSession, now: number) => {
  switch (session.status) {
    case "ARRIVING": {
      if (!session.expectedArrivalAt) return "도착 시간 미정";
      const delayMs = (session.arrivalDelayMinutes ?? 0) * MINUTE_MS;
      const minutes = minutesBetween(now, Date.parse(session.expectedArrivalAt) + delayMs);
      return minutes > 0 ? `${minutes}분 후 도착` : "곧 도착";
    }
    case "PARKED": {
      if (!session.parkedAt) return "주차 완료";
      return formatDuration(minutesSince(session.parkedAt, now));
    }
    case "PICKUP_REQUESTED":
      return "출차 요청";
    case "PICKUP_PREPARING": {
      if (!session.expectedPickupAt) return "출차 준비 중";
      const minutes = minutesBetween(now, Date.parse(session.expectedPickupAt));
      return minutes > 0 ? `${minutes}분 후 출차` : "곧 출차";
    }
  }
};

export { formatDuration, formatFeeBreakdown, formatPlateNumber, formatSessionLabel, minutesSince };
