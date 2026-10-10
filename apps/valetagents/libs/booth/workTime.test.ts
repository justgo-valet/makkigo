import { describe, expect, it } from "vitest";

import { isOvernightWorkTime, isWorkTime, workTimeToMinutes } from "./workTime";

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
});
