import { describe, expect, it } from "vitest";

import { getOnboardingPollInterval } from "./useOnboardingStatus";

import type { OnboardingStatusResponse } from "../schemas/onboarding";

const status = (
  role: OnboardingStatusResponse["role"],
  state: OnboardingStatusResponse["state"],
): OnboardingStatusResponse => ({
  role,
  state,
  nextPath: state === "COMPLETE" ? "/" : "/onboarding",
  name: null,
  requests: [],
});

describe("getOnboardingPollInterval", () => {
  it.each(["BOOTH_REQUIRED", "AWAITING_APPROVAL"] as const)(
    "polls every 5 seconds while a valet agent is %s",
    (state) => {
      expect(getOnboardingPollInterval(status("VALET_AGENT", state))).toBe(5_000);
    },
  );

  it("stops polling once a valet agent is approved", () => {
    expect(getOnboardingPollInterval(status("VALET_AGENT", "COMPLETE"))).toBe(false);
  });

  it("does not poll before a role is assigned", () => {
    expect(getOnboardingPollInterval(status(null, "ROLE_REQUIRED"))).toBe(false);
  });

  it("does not poll without status data", () => {
    expect(getOnboardingPollInterval(undefined)).toBe(false);
  });
});
