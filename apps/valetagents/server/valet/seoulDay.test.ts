import { describe, expect, it } from "vitest";

import { parseSeoulDate, seoulDayRange } from "./seoulDay";

const NOW = new Date("2026-11-06T15:30:00.000Z");

describe("seoulDay", () => {
  it("accepts real dates up to today in Seoul", () => {
    expect(parseSeoulDate("2026-11-07", NOW)).toBe("2026-11-07");
    expect(parseSeoulDate("2024-02-29", NOW)).toBe("2024-02-29");
  });

  it("rejects malformed, impossible and future dates", () => {
    for (const value of ["2026-11-08", "2026-02-30", "2026-13-01", "2026-1-07", "", undefined]) {
      expect(parseSeoulDate(value, NOW)).toBeNull();
    }
  });

  it("covers midnight to midnight in Seoul", () => {
    expect(seoulDayRange("2026-11-07")).toEqual({
      gte: new Date("2026-11-06T15:00:00.000Z"),
      lt: new Date("2026-11-07T15:00:00.000Z"),
    });
  });
});
