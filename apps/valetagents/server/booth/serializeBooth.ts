import "server-only";

import { serializeWorkTime } from "./workTime";

import type { RequestSummary, RequestSummaryWithoutBooth } from "@/libs/booth/contracts/agent-request";
import type { SelectedBooth } from "@/libs/booth/contracts/booths";
import type { BoothAgentStatus } from "database";

type FeePolicyRecord = {
  baseMinutes: number;
  baseFee: number;
  extraUnitMinutes: number;
  extraUnitFee: number;
  effectiveFrom: Date;
};

type BoothRecord = {
  id: number;
  name: string;
  address: string;
  addressDetail: string | null;
  feePolicies: FeePolicyRecord[];
};

type RequestRecord = {
  id: number;
  status: BoothAgentStatus;
  workStartTime: Date | null;
  workEndTime: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const serializeSelectedBooth = (booth: BoothRecord): SelectedBooth => {
  const policy = booth.feePolicies[0];

  return {
    id: booth.id,
    name: booth.name,
    address: booth.address,
    addressDetail: booth.addressDetail,
    feePolicy: policy
      ? {
          baseMinutes: policy.baseMinutes,
          baseFee: policy.baseFee,
          extraUnitMinutes: policy.extraUnitMinutes,
          extraUnitFee: policy.extraUnitFee,
          effectiveFrom: policy.effectiveFrom.toISOString(),
        }
      : null,
  };
};

const serializeRequestWithoutBooth = (request: RequestRecord): RequestSummaryWithoutBooth => ({
  id: request.id,
  status: request.status,
  workStartTime: serializeWorkTime(request.workStartTime),
  workEndTime: serializeWorkTime(request.workEndTime),
  createdAt: request.createdAt.toISOString(),
  updatedAt: request.updatedAt.toISOString(),
});

const serializeRequest = (request: RequestRecord & { booth: BoothRecord }): RequestSummary => ({
  ...serializeRequestWithoutBooth(request),
  booth: serializeSelectedBooth(request.booth),
});

export { serializeRequest, serializeRequestWithoutBooth, serializeSelectedBooth };
export type { BoothRecord, RequestRecord };
