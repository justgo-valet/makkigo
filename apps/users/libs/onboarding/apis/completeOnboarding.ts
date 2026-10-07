import { isHTTPError } from "ky";

import { apiClient } from "@/libs/common/api/apiClient";
import { onboardingErrorResponseSchema } from "@/libs/onboarding/contracts/onboarding";

import type {
  CompleteOnboardingRequest,
  OnboardingErrorCode,
} from "@/libs/onboarding/contracts/onboarding";

const completeOnboarding = async (request: CompleteOnboardingRequest) => {
  await apiClient.post("onboarding", { json: request });
};

const getOnboardingErrorCode = (error: unknown): OnboardingErrorCode | null => {
  if (!isHTTPError(error)) return null;

  const body = onboardingErrorResponseSchema.safeParse(error.data);

  return body.success ? body.data.code : null;
};

export { completeOnboarding, getOnboardingErrorCode };
