import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const onboarding = vi.hoisted(() => ({ getStaffOnboardingState: vi.fn() }));

vi.mock("./getStaffOnboardingState", () => ({
  getStaffOnboardingState: onboarding.getStaffOnboardingState,
}));

import { getProtectedStaffAccess } from "./getProtectedStaffAccess";

const status = (role: "VALET_AGENT" | "MERCHANT_ADMIN" | null, state: string) => ({
  role,
  state,
  nextPath: state === "COMPLETE" ? "/" : "/onboarding",
  requests: [],
});

describe("getProtectedStaffAccess", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects inactive and role-incomplete staff", async () => {
    onboarding.getStaffOnboardingState.mockResolvedValueOnce(null).mockResolvedValueOnce(status(null, "ROLE_REQUIRED"));

    await expect(getProtectedStaffAccess(7)).resolves.toMatchObject({
      ok: false,
      reason: "AUTH_REQUIRED",
    });
    await expect(getProtectedStaffAccess(7)).resolves.toMatchObject({
      ok: false,
      reason: "STAFF_ONBOARDING_REQUIRED",
    });
  });

  it.each(["MERCHANT_REGISTRATION_REQUIRED", "MERCHANT_APPROVAL_PENDING"])(
    "rejects an incomplete merchant in %s",
    async (state) => {
      onboarding.getStaffOnboardingState.mockResolvedValue(status("MERCHANT_ADMIN", state));
      await expect(getProtectedStaffAccess(7)).resolves.toMatchObject({
        ok: false,
        reason: "MERCHANT_ONBOARDING_REQUIRED",
      });
    },
  );

  it.each([
    ["MERCHANT_ADMIN", "COMPLETE"],
    ["VALET_AGENT", "COMPLETE"],
    ["VALET_AGENT", "BOOTH_REQUIRED"],
    ["VALET_AGENT", "AWAITING_APPROVAL"],
  ] as const)("preserves %s access in %s", async (role, state) => {
    onboarding.getStaffOnboardingState.mockResolvedValue(status(role, state));
    await expect(getProtectedStaffAccess(7)).resolves.toMatchObject({ ok: true });
  });
});
