import "server-only";

import { getStaffOnboardingState } from "./getStaffOnboardingState";

import type { OnboardingStatusResponse } from "@/libs/onboarding/contracts/status";

type ProtectedStaffAccess =
  | { ok: true; onboarding: OnboardingStatusResponse }
  | {
      ok: false;
      reason: "AUTH_REQUIRED" | "STAFF_ONBOARDING_REQUIRED" | "MERCHANT_ONBOARDING_REQUIRED";
      onboarding: OnboardingStatusResponse | null;
    };

const getProtectedStaffAccess = async (staffId: number): Promise<ProtectedStaffAccess> => {
  const onboarding = await getStaffOnboardingState(staffId);
  if (!onboarding) return { ok: false, reason: "AUTH_REQUIRED", onboarding: null };
  if (onboarding.state === "ROLE_REQUIRED") {
    return { ok: false, reason: "STAFF_ONBOARDING_REQUIRED", onboarding };
  }
  if (onboarding.role === "MERCHANT_ADMIN" && onboarding.state !== "COMPLETE") {
    return { ok: false, reason: "MERCHANT_ONBOARDING_REQUIRED", onboarding };
  }
  return { ok: true, onboarding };
};

export { getProtectedStaffAccess };
export type { ProtectedStaffAccess };
