import type { AgentRequestStatus, FeePolicy } from "./schemas/onboarding";

const currencyFormatter = new Intl.NumberFormat("ko-KR");

const formatFee = (fee: number) => currencyFormatter.format(fee);

const formatDuration = (minutes: number) =>
  minutes % 60 === 0 ? `${minutes / 60}시간` : `${minutes}분`;

const formatFeePolicy = (feePolicy: FeePolicy | null) => {
  if (!feePolicy) return "요금 정보 미등록";

  return `기본요금 ${formatDuration(feePolicy.baseMinutes)} ${formatFee(
    feePolicy.baseFee,
  )}원 · 추가요금 ${formatDuration(feePolicy.extraUnitMinutes)} 당 ${formatFee(
    feePolicy.extraUnitFee,
  )}원`;
};

const REQUEST_STATUS_LABELS: Record<AgentRequestStatus, string> = {
  REQUESTED: "승인 대기",
  APPROVED: "승인 완료",
  REJECTED: "요청 거절",
};

const formatWorkTime = (start: string | null, end: string | null) => {
  if (!start || !end) return "근무 시간 미설정";
  return `${start} ~ ${end}${start > end ? " (다음 날)" : ""}`;
};

export { REQUEST_STATUS_LABELS, formatDuration, formatFee, formatFeePolicy, formatWorkTime };
