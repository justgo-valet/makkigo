import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const onboarding = vi.hoisted(() => ({ getStaffOnboardingState: vi.fn() }));

vi.mock("@/server/onboarding/getStaffOnboardingState", () => ({
  getStaffOnboardingState: onboarding.getStaffOnboardingState,
}));

import { getPathAfterLogin } from "./getPathAfterLogin";

describe("getPathAfterLogin", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["ROLE_REQUIRED", "/onboarding"],
    ["BOOTH_REQUIRED", "/onboarding"],
    ["AWAITING_APPROVAL", "/onboarding"],
    ["MERCHANT_REGISTRATION_REQUIRED", "/onboarding"],
    ["MERCHANT_APPROVAL_PENDING", "/onboarding"],
    ["COMPLETE", "/"],
  ] as const)("uses the shared %s onboarding decision", async (state, nextPath) => {
    onboarding.getStaffOnboardingState.mockResolvedValue({ state, nextPath });

    await expect(getPathAfterLogin(7)).resolves.toBe(nextPath);
    expect(onboarding.getStaffOnboardingState).toHaveBeenCalledWith(7);
  });

  it("fails closed to onboarding when the staff disappears", async () => {
    onboarding.getStaffOnboardingState.mockResolvedValue(null);
    await expect(getPathAfterLogin(7)).resolves.toBe("/onboarding");
  });
});
