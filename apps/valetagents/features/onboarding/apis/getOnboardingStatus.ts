import { apiClient } from "@/libs/common/api/apiClient";

import { parseOnboardingStatusResponse } from "../schemas/onboarding";

import type { OnboardingStatusResponse } from "../schemas/onboarding";

const getOnboardingStatus = async (signal?: AbortSignal): Promise<OnboardingStatusResponse> => {
  const response = await apiClient.get("onboarding/status", { signal }).json<unknown>();
  return parseOnboardingStatusResponse(response);
};

export { getOnboardingStatus };
