import { describe, expect, it } from "vitest";

import {
  BOOTH_MERCHANT_PAGE_SIZE,
  boothMerchantPageSchema,
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
