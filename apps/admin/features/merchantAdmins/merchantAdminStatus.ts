import type { StatusBadgeProps } from "@/features/common/StatusBadge";

export const merchantAdminStatus = (
  account: { disabledAt: Date | null; lockedUntil: Date | null; passwordChangeRequired: boolean },
  now: Date,
): StatusBadgeProps => {
  if (account.disabledAt) return { label: "중지됨", tone: "danger" };
  if (account.lockedUntil && account.lockedUntil > now) return { label: "잠김", tone: "warning" };
  if (account.passwordChangeRequired) return { label: "비밀번호 변경 전", tone: "info" };
  return { label: "사용 중", tone: "success" };
};
