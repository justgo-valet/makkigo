import { describe, expect, it } from "vitest";

import { getDetail, getReviewAvailability } from "./useMerchantManagement";

describe("getReviewAvailability", () => {
  it("allows accepting and rejecting only with merchants checked", () => {
    expect(getReviewAvailability([])).toMatchObject({ canAccept: false, canReject: false });
    expect(getReviewAvailability([{ status: "PENDING" }])).toMatchObject({
      canAccept: true,
      canReject: true,
    });
  });

  it("blocks rejecting once a registered merchant is checked", () => {
    expect(getReviewAvailability([{ status: "PENDING" }, { status: "APPROVED" }])).toMatchObject({
      canReject: false,
      rejectBlockedByApproved: true,
    });
  });
});

describe("getDetail", () => {
  it("shows nothing once the chosen merchant is not on the page, as after changing page", () => {
    expect(getDetail([{ id: 4 }, { id: 7 }], 7)).toEqual({ id: 7 });
    expect(getDetail([{ id: 9 }], 7)).toBeNull();
  });
});
