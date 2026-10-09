import { isHTTPError } from "ky";

import { apiClient } from "@/libs/common/api/apiClient";
import {
  onboardingErrorResponseSchema,
  completeOnboardingRequestSchema,
} from "@/libs/onboarding/contracts/onboarding";

import type {
  CompleteOnboardingRequest,
  OnboardingErrorCode,
} from "@/libs/onboarding/contracts/onboarding";

const completeOnboarding = async (request: CompleteOnboardingRequest) => {
  const parsedRequest = completeOnboardingRequestSchema.safeParse(request);

  if (!parsedRequest.success) {
    throw new Error("유효하지 않은 요청입니다.");
  }

  await apiClient.post("onboarding", { json: parsedRequest.data });
};

const getOnboardingErrorCode = (error: unknown): OnboardingErrorCode | null => {
  if (!isHTTPError(error)) return null;

  const body = onboardingErrorResponseSchema.safeParse(error.data);

  return body.success ? body.data.code : null;
};

export { completeOnboarding, getOnboardingErrorCode };
