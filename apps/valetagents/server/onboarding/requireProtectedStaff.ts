import "server-only";

import { redirect } from "next/navigation";

import { getProtectedStaffAccess } from "./getProtectedStaffAccess";

const requireProtectedStaff = async (staffId: number) => {
  const access = await getProtectedStaffAccess(staffId);
  if (access.ok) return access.onboarding;
  if (access.reason === "AUTH_REQUIRED") redirect("/login");
  redirect(access.reason === "MERCHANT_ONBOARDING_REQUIRED" ? "/onboarding/merchant" : "/onboarding");
};

export { requireProtectedStaff };
