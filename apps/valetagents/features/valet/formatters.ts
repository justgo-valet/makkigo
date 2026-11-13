import type { BoothValetSession } from "./schemas/sessions";

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

const formatAgo = (iso: string, now: number, action: string) => {
  const minutes = minutesSince(iso, now);
  return minutes === 0 ? `방금 ${action}` : `${formatDuration(minutes)} 전 ${action}`;
};

const formatWon = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

const formatSessionLabel = (session: BoothValetSession, now: number) => {
  switch (session.status) {
    case "ARRIVING": {
      if (!session.expectedArrivalAt) return "도착 시간 미정";
      const delayMs = (session.arrivalDelayMinutes ?? 0) * MINUTE_MS;
      const minutes = minutesBetween(now, Date.parse(session.expectedArrivalAt) + delayMs);
      return minutes > 0 ? `${minutes}분 뒤 도착` : "곧 도착";
    }
    case "PARKED": {
      if (!session.parkedAt) return "주차 완료";
      return `${formatDuration(minutesSince(session.parkedAt, now))}째`;
    }
    case "PICKUP_REQUESTED":
    case "PICKUP_PREPARING": {
      if (!session.pickupRequestedAt) return "출차 요청";
      return formatAgo(session.pickupRequestedAt, now, "요청");
    }
  }
};

const formatCompletedLabel = (completedAt: string, now: number) => formatAgo(completedAt, now, "출차");

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const formatHistoryDate = (date: string) => {
  const day = new Date(`${date}T00:00:00.000Z`);
  return `${day.getUTCFullYear()}년 ${day.getUTCMonth() + 1}월 ${day.getUTCDate()}일 (${WEEKDAYS[day.getUTCDay()]})`;
};

const clockFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const formatClock = (iso: string) => clockFormat.format(new Date(iso));

export {
  formatClock,
  formatCompletedLabel,
  formatHistoryDate,
  formatPlateNumber,
  formatSessionLabel,
  formatWon,
};
