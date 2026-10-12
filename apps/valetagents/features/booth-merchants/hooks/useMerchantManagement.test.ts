import { describe, expect, it } from "vitest";

import { getDetail, getReviewAvailability, getSelectedMerchants } from "./useMerchantManagement";

const merchants = (...statuses: ("PENDING" | "APPROVED" | "REJECTED")[]) =>
  statuses.map((status) => ({ status }));

describe("getReviewAvailability", () => {
  it("allows nothing without a selection", () => {
    expect(getReviewAvailability([])).toEqual({
      canAccept: false,
      canReject: false,
      rejectBlockedByApproved: false,
    });
  });

  it("allows accepting and rejecting pending or rejected merchants", () => {
    expect(getReviewAvailability(merchants("PENDING", "REJECTED"))).toEqual({
      canAccept: true,
      canReject: true,
      rejectBlockedByApproved: false,
    });
  });

  it("blocks rejecting as soon as a registered merchant is selected", () => {
    expect(getReviewAvailability(merchants("PENDING", "APPROVED"))).toEqual({
      canAccept: true,
      canReject: false,
      rejectBlockedByApproved: true,
    });
  });

  it("leaves nothing to do when only registered merchants are selected", () => {
    expect(getReviewAvailability(merchants("APPROVED", "APPROVED"))).toEqual({
      canAccept: false,
      canReject: false,
      rejectBlockedByApproved: true,
    });
  });
});

describe("getDetail", () => {
  const page = [
    { id: 4, name: "가 식당" },
    { id: 7, name: "나 카페" },
  ];

  it("shows nothing until a row is chosen", () => {
    expect(getDetail(page, null)).toBeNull();
  });

  it("shows the merchant whose row was chosen", () => {
    expect(getDetail(page, 7)).toEqual({ id: 7, name: "나 카페" });
    expect(getDetail(page, 4)).toEqual({ id: 4, name: "가 식당" });
  });

  it("shows nothing once the chosen merchant is no longer on the page", () => {
    expect(getDetail(page, 9)).toBeNull();
    expect(getDetail([], 7)).toBeNull();
  });
});

describe("getSelectedMerchants", () => {
  const page = [{ id: 4 }, { id: 7 }, { id: 9 }];

  it("keeps the checked merchants in the order of the page", () => {
    expect(getSelectedMerchants(page, [9, 4])).toEqual([{ id: 4 }, { id: 9 }]);
  });

  it("drops checked merchants that are no longer on the page", () => {
    expect(getSelectedMerchants(page, [7, 12])).toEqual([{ id: 7 }]);
    expect(getSelectedMerchants([], [7])).toEqual([]);
  });
});
