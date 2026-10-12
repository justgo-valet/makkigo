import type { BoothFeePolicy } from "../generated/prisma/client";

type ValetFeePolicy = Pick<
  BoothFeePolicy,
  "baseMinutes" | "baseFee" | "extraUnitMinutes" | "extraUnitFee"
>;

const MINUTE_MS = 60 * 1000;

export const calculateValetFee = (policy: ValetFeePolicy, parkedAt: Date, endedAt: Date) => {
  const usedMinutes = Math.max(0, Math.floor((endedAt.getTime() - parkedAt.getTime()) / MINUTE_MS));
  const extraMinutes = usedMinutes - policy.baseMinutes;

  if (extraMinutes <= 0 || policy.extraUnitMinutes <= 0) return policy.baseFee;

  return policy.baseFee + Math.ceil(extraMinutes / policy.extraUnitMinutes) * policy.extraUnitFee;
};
