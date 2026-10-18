import { describe, expect, it } from "vitest";

import { getKeyboardInset } from "./use-keyboard-inset";

describe("getKeyboardInset", () => {
  it("is 0 when no keyboard is shown", () => {
    expect(
      getKeyboardInset({ innerHeight: 800, visualHeight: 800, visualOffsetTop: 0 }),
    ).toBe(0);
  });

  it("is the covered height when only the visual viewport shrinks (iOS Safari)", () => {
    expect(
      getKeyboardInset({ innerHeight: 800, visualHeight: 500, visualOffsetTop: 0 }),
    ).toBe(300);
  });

  it("subtracts the distance the visual viewport scrolled down", () => {
    expect(
      getKeyboardInset({ innerHeight: 800, visualHeight: 500, visualOffsetTop: 120 }),
    ).toBe(180);
  });

  it("is 0 when the layout viewport shrinks with the keyboard (app webview)", () => {
    expect(
      getKeyboardInset({ innerHeight: 500, visualHeight: 500, visualOffsetTop: 0 }),
    ).toBe(0);
  });

  it("never goes negative", () => {
    expect(
      getKeyboardInset({ innerHeight: 500, visualHeight: 500, visualOffsetTop: 40 }),
    ).toBe(0);
  });
});
