import { describe, expect, it } from "vitest";

import { formatRegisteredDate } from "./formatters";

describe("formatRegisteredDate", () => {
  it("shows the Seoul date of a registered merchant", () => {
    expect(formatRegisteredDate({ status: "APPROVED", updatedAt: "2026-07-11T15:30:00.000Z" })).toBe(
      "2026-07-12",
    );
  });

  it("shows no date unless the merchant is registered", () => {
    expect(formatRegisteredDate({ status: "PENDING", updatedAt: "2026-07-11T15:30:00.000Z" })).toBe("-");
  });
});
