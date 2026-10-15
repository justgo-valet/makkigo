import { describe, expect, it } from "vitest";

import { parseTimePickerValue, validateMinuteStep } from "./time-picker-sheet";

describe("TimePickerSheet value validation", () => {
  it("uses midnight for an unset value", () => {
    expect(parseTimePickerValue(null, 1)).toEqual({ hour: 0, minute: 0 });
  });

  it("accepts a valid end-of-day value", () => {
    expect(parseTimePickerValue("23:59", 1)).toEqual({ hour: 23, minute: 59 });
  });

  it.each([0, -1, 7, 1.5])("rejects invalid minuteStep %s", (minuteStep) => {
    expect(() => validateMinuteStep(minuteStep)).toThrow(/positive integer divisor/);
  });

  it("rejects values that do not align with minuteStep instead of rounding", () => {
    expect(() => parseTimePickerValue("10:07", 5)).toThrow(/align with minuteStep/);
  });

  it.each(["24:00", "9:00", "12:60", "invalid"])("rejects invalid value %s", (value) => {
    expect(() => parseTimePickerValue(value, 1)).toThrow(/Invalid time picker value/);
  });
});
