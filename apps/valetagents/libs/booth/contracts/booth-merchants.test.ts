import { describe, expect, it } from "vitest";

import {
  BOOTH_MERCHANT_PAGE_SIZE,
  boothMerchantListResponseSchema,
  boothMerchantPageSchema,
} from "./booth-merchants";

const merchant = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  name: "샘플 식당",
  address: "서울특별시 중구 세종대로 110",
  addressDetail: null,
  status: "PENDING",
  updatedAt: "2026-10-10T01:00:00.000Z",
  ...overrides,
});

const response = (items: unknown[]) => ({ items, page: 1, totalPages: 1 });

describe("BOOTH_MERCHANT_PAGE_SIZE", () => {
  it("shows five merchants per page", () => {
    expect(BOOTH_MERCHANT_PAGE_SIZE).toBe(5);
  });
});

describe("boothMerchantPageSchema", () => {
  it("reads a page number from a query string", () => {
    expect(boothMerchantPageSchema.parse("2")).toBe(2);
  });

  it.each(["0", "-1", "abc", "1.5"])("rejects page %s", (page) => {
    expect(boothMerchantPageSchema.safeParse(page).success).toBe(false);
  });
});

describe("boothMerchantListResponseSchema", () => {
  it.each(["PENDING", "APPROVED", "REJECTED"])("accepts a merchant whose contract is %s", (status) => {
    expect(
      boothMerchantListResponseSchema.safeParse(
        response([merchant({ status, addressDetail: "2층" })]),
      ).success,
    ).toBe(true);
  });

  it("carries no registration date of its own", () => {
    const parsed = boothMerchantListResponseSchema.parse(
      response([merchant({ status: "APPROVED", approvedAt: "2026-10-10T01:00:00.000Z" })]),
    );

    expect(Object.keys(parsed.items[0])).toEqual([
      "id",
      "name",
      "address",
      "addressDetail",
      "status",
      "updatedAt",
    ]);
  });

  it.each([
    ["an unknown contract status", { status: "REQUESTED" }],
    ["a missing address", { address: undefined }],
    ["an updatedAt that is not an ISO time", { updatedAt: "2026-10-10" }],
  ])("rejects %s", (_label, overrides) => {
    expect(boothMerchantListResponseSchema.safeParse(response([merchant(overrides)])).success).toBe(
      false,
    );
  });
});
