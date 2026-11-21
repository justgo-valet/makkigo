import { describe, expect, it } from "vitest";

import { formatIssuedDate } from "./ticketFormat";

describe("formatIssuedDate", () => {
  it("shows the issue date in Korean time", () => {
    expect(formatIssuedDate("2026-11-20T15:30:00.000Z")).toBe("2026.11.21");
    expect(formatIssuedDate(null)).toBeNull();
  });
});
