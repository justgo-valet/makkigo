import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseWorkTime, serializeWorkTime } from "./workTime";

describe("database work time", () => {
  it.each(["00:00", "09:30", "22:00", "23:59"])("round-trips %s in UTC", (value) => {
    const parsed = parseWorkTime(value);

    expect(parsed.getUTCSeconds()).toBe(0);
    expect(serializeWorkTime(parsed)).toBe(value);
  });

  it("keeps nullable legacy values", () => {
    expect(serializeWorkTime(null)).toBeNull();
  });
});
