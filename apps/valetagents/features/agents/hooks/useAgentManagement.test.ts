import { describe, expect, it } from "vitest";

import { getReviewAvailability } from "./useAgentManagement";

const agents = (...statuses: ("REQUESTED" | "APPROVED" | "REJECTED")[]) =>
  statuses.map((status) => ({ status }));

describe("getReviewAvailability", () => {
  it("allows nothing without a selection", () => {
    expect(getReviewAvailability([])).toEqual({
      canAccept: false,
      canReject: false,
      rejectBlockedByApproved: false,
    });
  });

  it("allows accepting and rejecting pending or rejected agents", () => {
    expect(getReviewAvailability(agents("REQUESTED", "REJECTED"))).toEqual({
      canAccept: true,
      canReject: true,
      rejectBlockedByApproved: false,
    });
  });

  it("blocks rejecting as soon as a registered agent is selected", () => {
    expect(getReviewAvailability(agents("REQUESTED", "APPROVED"))).toEqual({
      canAccept: true,
      canReject: false,
      rejectBlockedByApproved: true,
    });
  });

  it("leaves nothing to do when only registered agents are selected", () => {
    expect(getReviewAvailability(agents("APPROVED", "APPROVED"))).toEqual({
      canAccept: false,
      canReject: false,
      rejectBlockedByApproved: true,
    });
  });
});
