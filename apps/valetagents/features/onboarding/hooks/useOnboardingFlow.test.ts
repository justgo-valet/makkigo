import { describe, expect, it } from "vitest";

import { getInitialView, getSavedToastMessage } from "./useOnboardingFlow";

import type { AgentRequestResponse, OnboardingStatusResponse } from "../schemas/onboarding";

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

const saved = (outcome: AgentRequestResponse["outcome"]): AgentRequestResponse => ({
  outcome,
  request: {
    id: 1,
    status: "REQUESTED",
    booth: {
      id: 1,
      name: "광화문 부스",
      address: "서울시 종로구 세종대로 175",
      addressDetail: null,
      feePolicy: null,
    },
    workStartTime: "09:00",
    workEndTime: "18:00",
    createdAt: "2026-10-10T00:00:00.000Z",
    updatedAt: "2026-10-10T00:00:00.000Z",
  },
});

describe("getSavedToastMessage", () => {
  it.each(["CREATED", "REOPENED"] as const)("names the booth after a %s request", (outcome) => {
    expect(getSavedToastMessage(saved(outcome))).toBe("광화문 부스에 요원 등록을 요청했어요");
  });

  it("confirms an edit of a pending request", () => {
    expect(getSavedToastMessage(saved("UPDATED"))).toBe("요청 내용을 수정했어요");
  });
});
