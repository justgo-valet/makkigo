import type { Prisma } from "../generated/prisma/client";

export interface ValetFeePolicy {
  baseMinutes: number;
  baseFee: number;
  extraUnitMinutes: number;
  extraUnitFee: number;
}

export interface ValetFee extends ValetFeePolicy {
  usedMinutes: number;
  extraUnits: number;
  extraFee: number;
  total: number;
}

const MINUTE_MS = 60 * 1000;

export const calculateValetFee = (
  policy: ValetFeePolicy,
  parkedAt: Date,
  baseTime: Date,
): ValetFee => {
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

export const findFeePolicy = (
  client: Prisma.TransactionClient,
  boothId: number,
  baseTime: Date,
): Promise<ValetFeePolicy | null> =>
  client.boothFeePolicy.findFirst({
    where: { boothId, effectiveFrom: { lte: baseTime } },
    orderBy: [{ effectiveFrom: "desc" }, { id: "desc" }],
    select: { baseMinutes: true, baseFee: true, extraUnitMinutes: true, extraUnitFee: true },
  });
