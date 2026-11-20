import type { StatusBadgeProps } from "./StatusBadge";

const VALET_SESSION_STATUS = {
  ARRIVING: { label: "도착 예정", tone: "info" },
  PARKED: { label: "주차 중", tone: "success" },
  PICKUP_REQUESTED: { label: "출차 요청", tone: "warning" },
  PICKUP_PREPARING: { label: "출차 준비", tone: "warning" },
  COMPLETED: { label: "완료", tone: "neutral" },
  CANCELLED: { label: "취소", tone: "danger" },
} as const satisfies Record<string, StatusBadgeProps>;

const BOOTH_MERCHANT_STATUS = {
  PENDING: { label: "승인 대기", tone: "warning" },
  APPROVED: { label: "연결됨", tone: "success" },
  REJECTED: { label: "거절됨", tone: "danger" },
} as const satisfies Record<string, StatusBadgeProps>;

const BOOTH_AGENT_STATUS = {
  REQUESTED: { label: "신청", tone: "warning" },
  APPROVED: { label: "승인", tone: "success" },
  REJECTED: { label: "거절", tone: "danger" },
} as const satisfies Record<string, StatusBadgeProps>;

export { BOOTH_AGENT_STATUS, BOOTH_MERCHANT_STATUS, VALET_SESSION_STATUS };
