import { describe, expect, it } from "vitest";

import { canStartDrag, resolveDragDirection, shouldCloseOnRelease } from "./use-sheet-drag";

describe("resolveDragDirection", () => {
  it("waits until the finger moves far enough", () => {
    expect(resolveDragDirection({ dx: 1, dy: 3 })).toBe("pending");
  });

  it("recognises a downward drag", () => {
    expect(resolveDragDirection({ dx: 2, dy: 10 })).toBe("down");
  });

  it("gives up on upward or sideways movement", () => {
    expect(resolveDragDirection({ dx: 0, dy: -10 })).toBe("other");
    expect(resolveDragDirection({ dx: 12, dy: 6 })).toBe("other");
  });
});

describe("shouldCloseOnRelease", () => {
  it("closes after dragging far enough", () => {
    expect(shouldCloseOnRelease({ distance: 80, velocity: 0 })).toBe(true);
    expect(shouldCloseOnRelease({ distance: 79, velocity: 0 })).toBe(false);
  });

  it("closes on a quick flick even over a short distance", () => {
    expect(shouldCloseOnRelease({ distance: 20, velocity: 0.6 })).toBe(true);
  });

  it("does not close when the finger moved back up", () => {
    expect(shouldCloseOnRelease({ distance: 0, velocity: 2 })).toBe(false);
  });
});

interface FakeNode {
  parentElement: FakeNode | null;
  attributes: Record<string, string>;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  scroller: boolean;
  getAttribute(name: string): string | null;
}

const node = (
  parent: FakeNode | null,
  options: Partial<Omit<FakeNode, "parentElement" | "getAttribute">> = {},
): FakeNode => ({
  parentElement: parent,
  attributes: {},
  scrollTop: 0,
  scrollHeight: 0,
  clientHeight: 0,
  scroller: false,
  ...options,
  getAttribute(name) {
    return this.attributes[name] ?? null;
  },
});

const isScroller = (candidate: FakeNode) => candidate.scroller;

describe("canStartDrag", () => {
  it("allows dragging from plain content", () => {
    const sheet = node(null);
    const target = node(node(sheet));
    expect(canStartDrag(target, sheet, isScroller)).toBe(true);
  });

  it("allows dragging when the scrollable area is at the top", () => {
    const sheet = node(null);
    const list = node(sheet, { scroller: true, scrollHeight: 900, clientHeight: 300 });
    expect(canStartDrag(node(list), sheet, isScroller)).toBe(true);
  });

  it("lets the list scroll when it is scrolled down", () => {
    const sheet = node(null);
    const list = node(sheet, {
      scroller: true,
      scrollHeight: 900,
      clientHeight: 300,
      scrollTop: 40,
    });
    expect(canStartDrag(node(list), sheet, isScroller)).toBe(false);
  });

  it("ignores scrollable areas that have nothing to scroll", () => {
    const sheet = node(null);
    const list = node(sheet, { scroller: true, scrollHeight: 200, clientHeight: 300 });
    expect(canStartDrag(node(list), sheet, isScroller)).toBe(true);
  });

  it("respects data-sheet-drag=none", () => {
    const sheet = node(null);
    const wheel = node(sheet, { attributes: { "data-sheet-drag": "none" } });
    expect(canStartDrag(node(wheel), sheet, isScroller)).toBe(false);
  });

  it("does not look above the sheet", () => {
    const page = node(null, { scroller: true, scrollHeight: 900, clientHeight: 300, scrollTop: 50 });
    const sheet = node(page);
    expect(canStartDrag(node(sheet), sheet, isScroller)).toBe(true);
  });
});
