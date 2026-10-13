import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const onboarding = vi.hoisted(() => ({ getStaffOnboardingState: vi.fn() }));

vi.mock("./getStaffOnboardingState", () => ({
  getStaffOnboardingState: onboarding.getStaffOnboardingState,
}));

import { getMerchantRegistrationAccess } from "./getMerchantRegistrationAccess";

const status = (role: "VALET_AGENT" | "MERCHANT_ADMIN" | null, state: string) => ({
  role,
  state,
  nextPath: state === "COMPLETE" ? "/" : "/onboarding",
  requests: [],
});

describe("getMerchantRegistrationAccess", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["MERCHANT_REGISTRATION_REQUIRED", "COMPLETE"])("allows %s", async (state) => {
    onboarding.getStaffOnboardingState.mockResolvedValue(status("MERCHANT_ADMIN", state));
    await expect(getMerchantRegistrationAccess(7)).resolves.toMatchObject({ ok: true });
  });

  it("rejects pending without granting mutation access", async () => {
    onboarding.getStaffOnboardingState.mockResolvedValue(
      status("MERCHANT_ADMIN", "MERCHANT_APPROVAL_PENDING"),
    );
    await expect(getMerchantRegistrationAccess(7)).resolves.toEqual({
      ok: false,
      reason: "MERCHANT_APPROVAL_PENDING",
    });
  });

  it("rejects a valet and inactive staff", async () => {
    onboarding.getStaffOnboardingState
      .mockResolvedValueOnce(status("VALET_AGENT", "COMPLETE"))
      .mockResolvedValueOnce(null);
    await expect(getMerchantRegistrationAccess(7)).resolves.toMatchObject({
      ok: false,
      reason: "MERCHANT_ADMIN_REQUIRED",
    });
    await expect(getMerchantRegistrationAccess(7)).resolves.toMatchObject({
      ok: false,
      reason: "AUTH_REQUIRED",
    });
  });
});
