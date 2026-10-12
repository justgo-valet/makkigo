import { describe, expect, it } from "vitest";

import { CONTRACT_STATUS_LABELS, formatMerchantAddress, formatRegisteredDate } from "./formatters";

describe("booth merchant formatters", () => {
  it("labels the three contract statuses", () => {
    expect(CONTRACT_STATUS_LABELS).toEqual({ APPROVED: "등록", PENDING: "대기", REJECTED: "거절" });
  });

  it("shows the Seoul date a registered merchant was approved on", () => {
    expect(formatRegisteredDate({ status: "APPROVED", updatedAt: "2026-07-12T03:00:00.000Z" })).toBe(
      "2026-07-12",
    );
  });

  it("moves to the next day at midnight in Seoul, not in UTC", () => {
    // UTC 14:59 = 서울 23:59, UTC 15:30 = 서울 다음 날 00:30
    expect(formatRegisteredDate({ status: "APPROVED", updatedAt: "2026-07-11T14:59:59.999Z" })).toBe(
      "2026-07-11",
    );
    expect(formatRegisteredDate({ status: "APPROVED", updatedAt: "2026-07-11T15:30:00.000Z" })).toBe(
      "2026-07-12",
    );
    expect(formatRegisteredDate({ status: "APPROVED", updatedAt: "2026-12-31T15:00:00.000Z" })).toBe(
      "2027-01-01",
    );
  });

  it.each(["PENDING", "REJECTED"] as const)("shows no registration date while the contract is %s", (status) => {
    expect(formatRegisteredDate({ status, updatedAt: "2026-07-12T03:00:00.000Z" })).toBe("-");
  });

  it("joins the address detail onto the address when there is one", () => {
    expect(formatMerchantAddress({ address: "서울특별시 중구 세종대로 110", addressDetail: "2층" })).toBe(
      "서울특별시 중구 세종대로 110 2층",
    );
    expect(formatMerchantAddress({ address: "서울특별시 중구 세종대로 110", addressDetail: null })).toBe(
      "서울특별시 중구 세종대로 110",
    );
  });
});
