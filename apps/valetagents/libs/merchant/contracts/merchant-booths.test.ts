import { describe, expect, it } from "vitest";

import { merchantBoothSearchQuerySchema, merchantBoothSearchResponseSchema } from "./merchant-booths";

describe("merchant booth contracts", () => {
  it.each(["가", "가".repeat(50)])("accepts a trimmed query boundary", (query) => {
    expect(merchantBoothSearchQuerySchema.parse(` ${query} `)).toBe(query);
  });

  it.each(["", " ", "가".repeat(51)])("rejects query %j", (query) => {
    expect(merchantBoothSearchQuerySchema.safeParse(query).success).toBe(false);
  });

  it("rejects leaked personal or fee fields", () => {
    expect(
      merchantBoothSearchResponseSchema.safeParse({
        items: [
          {
            id: 1,
            name: "부스",
            address: "서울",
            creatorId: 9,
            feePolicy: {},
            request: {},
          },
        ],
      }).success,
    ).toBe(false);
  });
});
