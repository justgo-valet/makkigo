import { describe, expect, it } from "vitest";

import { getNextActiveIndex } from "./useBoothCombobox";

describe("getNextActiveIndex", () => {
  it("moves down and wraps from the last result to the first", () => {
    expect(getNextActiveIndex("ArrowDown", 0, 3)).toBe(1);
    expect(getNextActiveIndex("ArrowDown", 2, 3)).toBe(0);
  });

  it("moves up and wraps from the first result to the last", () => {
    expect(getNextActiveIndex("ArrowUp", 2, 3)).toBe(1);
    expect(getNextActiveIndex("ArrowUp", 0, 3)).toBe(2);
  });
});
