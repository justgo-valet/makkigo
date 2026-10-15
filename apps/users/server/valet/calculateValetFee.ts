import "server-only";
import type { ValetFee } from "@/libs/valet/contracts/currentSession";

interface ValetFeePolicy {
  baseMinutes: number;
  baseFee: number;
  extraUnitMinutes: number;
  extraUnitFee: number;
}

const MINUTE_MS = 60 * 1000;

const calculateValetFee = (policy: ValetFeePolicy, parkedAt: Date, baseTime: Date): ValetFee => {
  const usedMinutes = Math.max(
    0,
    Math.floor((baseTime.getTime() - parkedAt.getTime()) / MINUTE_MS),
  );
  const overMinutes = Math.max(0, usedMinutes - policy.baseMinutes);
  const extraUnits =
    policy.extraUnitMinutes > 0 ? Math.ceil(overMinutes / policy.extraUnitMinutes) : 0;
  const extraFee = extraUnits * policy.extraUnitFee;

  return {
    baseMinutes: policy.baseMinutes,
    baseFee: policy.baseFee,
    extraUnitMinutes: policy.extraUnitMinutes,
    extraUnitFee: policy.extraUnitFee,
    usedMinutes,
    extraUnits,
    extraFee,
    total: policy.baseFee + extraFee,
  };
};

export { calculateValetFee };
export type { ValetFeePolicy };
