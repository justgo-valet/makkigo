import { describe, expect, it } from "vitest";

import {
  BOOTH_MERCHANT_PAGE_SIZE,
  boothMerchantPageSchema,
  boothMerchantReviewBodySchema,
} from "./booth-merchants";

describe("boothMerchantPageSchema", () => {
  it("shows five merchants per page and reads a page number from a query string", () => {
    expect(BOOTH_MERCHANT_PAGE_SIZE).toBe(5);
    expect(boothMerchantPageSchema.parse("2")).toBe(2);
  });

  it("rejects page 0", () => {
    expect(boothMerchantPageSchema.safeParse("0").success).toBe(false);
  });
});

const selected = (id: number) => ({ id, updatedAt: "2026-10-10T01:00:00.000Z" });

describe("boothMerchantReviewBodySchema", () => {
  it("accepts an approval of listed merchants", () => {
    expect(
      boothMerchantReviewBodySchema.safeParse({ status: "APPROVED", merchants: [selected(1)] }).success,
    ).toBe(true);
  });

  it("rejects a review without merchants", () => {
    expect(
      boothMerchantReviewBodySchema.safeParse({ status: "APPROVED", merchants: [] }).success,
    ).toBe(false);
  });
});
