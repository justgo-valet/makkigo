import { describe, expect, it } from "vitest";

import { getInitialView } from "./useOnboardingFlow";

import type { OnboardingStatusResponse } from "../schemas/onboarding";

const status = (state: OnboardingStatusResponse["state"]): OnboardingStatusResponse => ({
  role: "VALET_AGENT",
  state,
  nextPath: "/onboarding",
  requests: [],
});

describe("getInitialView", () => {
  it("starts on search when the agent has not requested a booth yet", () => {
    expect(getInitialView(status("BOOTH_REQUIRED"), null)).toBe("search");
  });

  it("starts on the request list while waiting for approval", () => {
    expect(getInitialView(status("AWAITING_APPROVAL"), null)).toBe("pending");
  });

  it("opens search for a waiting agent who asked to request another booth", () => {
    expect(getInitialView(status("AWAITING_APPROVAL"), "search")).toBe("search");
  });
});
