import "server-only";

import { getStaffOnboardingState } from "@/server/onboarding/getStaffOnboardingState";

export const getPathAfterLogin = async (staffId: number) => {
  const onboarding = await getStaffOnboardingState(staffId);
  return onboarding?.nextPath ?? "/onboarding";
};
