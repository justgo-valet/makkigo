import { describe, expect, it } from "vitest";

import {
  isOvernightWorkTime,
  isWithinWorkTime,
  isWorkTime,
  toSeoulWorkTime,
  workTimeToMinutes,
} from "./workTime";

describe("work time", () => {
  it.each(["00:00", "09:30", "23:59"])("accepts canonical HH:mm value %s", (value) => {
    expect(isWorkTime(value)).toBe(true);
  });

  it.each([null, undefined, "", "9:00", "24:00", "12:60", "12:00:00"])(
    "rejects invalid value %s",
    (value) => {
      expect(isWorkTime(value)).toBe(false);
    },
  );

  it("converts times to minutes and detects overnight ranges", () => {
    expect(workTimeToMinutes("22:00")).toBe(1_320);
    expect(isOvernightWorkTime("22:00", "06:00")).toBe(true);
    expect(isOvernightWorkTime("09:00", "18:00")).toBe(false);
  });

  it("includes the start and excludes the end of a daytime range", () => {
    expect(isWithinWorkTime("09:00", "18:00", "09:00")).toBe(true);
    expect(isWithinWorkTime("09:00", "18:00", "17:59")).toBe(true);
    expect(isWithinWorkTime("09:00", "18:00", "18:00")).toBe(false);
    expect(isWithinWorkTime("09:00", "18:00", "08:59")).toBe(false);
  });

  it("treats a range that crosses midnight as one shift", () => {
    expect(isWithinWorkTime("22:00", "06:00", "23:30")).toBe(true);
    expect(isWithinWorkTime("22:00", "06:00", "05:59")).toBe(true);
    expect(isWithinWorkTime("22:00", "06:00", "06:00")).toBe(false);
    expect(isWithinWorkTime("22:00", "06:00", "12:00")).toBe(false);
  });

  it("reads the wall-clock time in Seoul regardless of the server time zone", () => {
    expect(toSeoulWorkTime(new Date("2026-10-11T00:30:00.000Z"))).toBe("09:30");
    expect(toSeoulWorkTime(new Date("2026-10-11T15:05:00.000Z"))).toBe("00:05");
  });
});
