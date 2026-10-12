import "server-only";

import { getStaffOnboardingState } from "./getStaffOnboardingState";

import type { OnboardingStatusResponse } from "@/libs/onboarding/contracts/status";

type MerchantRegistrationAccess =
  | { ok: true; onboarding: OnboardingStatusResponse }
  | {
      ok: false;
      reason: "AUTH_REQUIRED" | "MERCHANT_ADMIN_REQUIRED" | "MERCHANT_APPROVAL_PENDING";
    };

const getMerchantRegistrationAccess = async (
  staffId: number,
): Promise<MerchantRegistrationAccess> => {
  const onboarding = await getStaffOnboardingState(staffId);
  if (!onboarding) return { ok: false, reason: "AUTH_REQUIRED" };
  if (onboarding.role !== "MERCHANT_ADMIN") {
    return { ok: false, reason: "MERCHANT_ADMIN_REQUIRED" };
  }
  if (onboarding.state === "MERCHANT_APPROVAL_PENDING") {
    return { ok: false, reason: "MERCHANT_APPROVAL_PENDING" };
  }
  if (
    onboarding.state !== "MERCHANT_REGISTRATION_REQUIRED" &&
    onboarding.state !== "COMPLETE"
  ) {
    return { ok: false, reason: "MERCHANT_ADMIN_REQUIRED" };
  }
  return { ok: true, onboarding };
};

export { getMerchantRegistrationAccess };
export type { MerchantRegistrationAccess };
