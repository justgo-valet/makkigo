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
const selectedMerchants = (count: number) => Array.from({ length: count }, (_, i) => selected(i + 1));

describe("boothMerchantReviewBodySchema", () => {
  it("accepts an approval or rejection for up to one page of listed merchants", () => {
    expect(
      boothMerchantReviewBodySchema.safeParse({ status: "APPROVED", merchants: [selected(1)] }).success,
    ).toBe(true);
    expect(
      boothMerchantReviewBodySchema.safeParse({
        status: "REJECTED",
        merchants: selectedMerchants(BOOTH_MERCHANT_PAGE_SIZE),
      }).success,
    ).toBe(true);
  });

  it.each([
    ["a status managers cannot set", { status: "PENDING", merchants: [selected(1)] }],
    ["no merchants", { status: "APPROVED", merchants: [] }],
    ["the same merchant twice", { status: "APPROVED", merchants: [selected(1), selected(1)] }],
    [
      "more merchants than one page",
      { status: "APPROVED", merchants: selectedMerchants(BOOTH_MERCHANT_PAGE_SIZE + 1) },
    ],
    ["a missing updatedAt", { status: "APPROVED", merchants: [{ id: 1 }] }],
    ["an updatedAt that is not an ISO time", { status: "APPROVED", merchants: [{ id: 1, updatedAt: "어제" }] }],
    ["a merchant id that is not a positive integer", { status: "APPROVED", merchants: [selected(0)] }],
    ["unknown keys", { status: "APPROVED", merchants: [selected(1)], boothId: 2 }],
    ["unknown keys on a merchant", { status: "APPROVED", merchants: [{ ...selected(1), name: "샘플" }] }],
  ])("rejects %s", (_label, body) => {
    expect(boothMerchantReviewBodySchema.safeParse(body).success).toBe(false);
  });
});
