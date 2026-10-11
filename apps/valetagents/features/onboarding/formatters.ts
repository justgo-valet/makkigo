import type { AgentRequestStatus, FeePolicy, SelectedBooth } from "./schemas/onboarding";

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

const REQUEST_ACTION_LABELS: Partial<Record<AgentRequestStatus, string>> = {
  REQUESTED: "요청 내용 수정",
  REJECTED: "다시 요청하기",
};

// 아직 요청하지 않은 부스는 처음 요청하는 문구를 쓴다.
const getRequestActionLabel = (status: AgentRequestStatus | undefined) =>
  (status && REQUEST_ACTION_LABELS[status]) ?? "등록 요청하기";

const formatAddress = ({ address, addressDetail }: Pick<SelectedBooth, "address" | "addressDetail">) =>
  [address, addressDetail].filter(Boolean).join(" ");

const formatTimeField = (value: string | null) => value?.replace(":", " : ") ?? "";

const formatWorkTime = (start: string | null, end: string | null) => {
  if (!start || !end) return "근무 시간 미설정";
  return `${start} ~ ${end}${start > end ? " (다음 날)" : ""}`;
};

export {
  REQUEST_STATUS_LABELS,
  formatAddress,
  formatDuration,
  formatFee,
  formatFeePolicy,
  formatTimeField,
  formatWorkTime,
  getRequestActionLabel,
};
