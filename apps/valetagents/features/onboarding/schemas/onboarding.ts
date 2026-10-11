import {
  agentRequestResponseSchema,
  boothSearchResponseSchema,
} from "@/libs/booth/contracts/agent-request";
import { isOvernightWorkTime, isWorkTime } from "@/libs/booth/workTime";
import { onboardingStatusResponseSchema } from "@/libs/onboarding/contracts/status";

import type {
  AgentRequestResponse,
  BoothAgentRequestStatus,
  BoothSearchResponse,
  RequestSummary,
  SearchItem,
} from "@/libs/booth/contracts/agent-request";
import type { FeePolicy, SelectedBooth } from "@/libs/booth/contracts/booths";
import type {
  OnboardingState,
  OnboardingStatusResponse,
  StaffRole,
} from "@/libs/onboarding/contracts/status";

const parseOnboardingStatusResponse = (value: unknown): OnboardingStatusResponse => {
  const result = onboardingStatusResponseSchema.safeParse(value);
  if (!result.success) throw new Error("유효하지 않은 온보딩 상태 응답입니다.");
  return result.data;
};

const parseBoothSearchResponse = (value: unknown): BoothSearchResponse => {
  const result = boothSearchResponseSchema.safeParse(value);
  if (!result.success) throw new Error("유효하지 않은 부스 검색 응답입니다.");
  return result.data;
};

const parseAgentRequestResponse = (value: unknown): AgentRequestResponse => {
  const result = agentRequestResponseSchema.safeParse(value);
  if (!result.success) throw new Error("유효하지 않은 등록 요청 응답입니다.");
  return result.data;
};

const isValidWorkTime = (value: string | null): value is string => isWorkTime(value);

export {
  isOvernightWorkTime,
  isValidWorkTime,
  parseAgentRequestResponse,
  parseBoothSearchResponse,
  parseOnboardingStatusResponse,
};
export type {
  AgentRequestResponse,
  BoothAgentRequestStatus as AgentRequestStatus,
  RequestSummary as AgentRequestSummary,
  SearchItem as BoothSearchItem,
  BoothSearchResponse,
  FeePolicy,
  OnboardingState,
  OnboardingStatusResponse,
  SelectedBooth,
  StaffRole,
};
