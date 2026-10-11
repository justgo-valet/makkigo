import type { BoothAgent } from "./schemas/agents";

const REGISTRATION_STATUS_LABELS: Record<BoothAgent["status"], string> = {
  APPROVED: "등록",
  REQUESTED: "요청 중",
  REJECTED: "거절",
};

const formatAgentName = ({ name }: Pick<BoothAgent, "name">) => name ?? "이름 없음";

const formatWorkTime = ({ workStartTime, workEndTime }: Pick<BoothAgent, "workStartTime" | "workEndTime">) =>
  workStartTime && workEndTime ? `${workStartTime} ~ ${workEndTime}` : "미설정";

// 근무상태는 등록된 요원에게만 뜻이 있다.
const formatWorkStatus = ({ status, working }: Pick<BoothAgent, "status" | "working">) => {
  if (status !== "APPROVED") return "-";
  return working ? "근무 중" : "근무 외";
};

export { REGISTRATION_STATUS_LABELS, formatAgentName, formatWorkStatus, formatWorkTime };
