import { describe, expect, it } from "vitest";

import { getDetail, getReachablePage, getReviewAvailability } from "./useMerchantManagement";

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

describe("getReachablePage", () => {
  it("stays on the page while it exists", () => {
    expect(getReachablePage(2, 3)).toBe(2);
    expect(getReachablePage(3, 3)).toBe(3);
  });

  it("falls back to the last page when the one being viewed is gone", () => {
    expect(getReachablePage(3, 2)).toBe(2);
    expect(getReachablePage(2, 1)).toBe(1);
  });

  it("does not move while the page has not been loaded", () => {
    expect(getReachablePage(3, null)).toBe(3);
  });
});
