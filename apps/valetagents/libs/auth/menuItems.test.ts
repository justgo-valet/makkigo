import { describe, expect, it } from "vitest";

import { getMenuItems } from "./menuItems";

describe("getMenuItems", () => {
  it("sends a booth manager to the agent management of the booth they created", () => {
    expect(getMenuItems({ role: "VALET_AGENT", managedBoothId: 3 })).toEqual([
      { label: "요원 관리", href: "/booths/3/agents" },
      { label: "설정", href: "/settings" },
    ]);
  });

  it("shows a merchant admin ticket management and settings", () => {
    expect(getMenuItems({ role: "MERCHANT_ADMIN", managedBoothId: 3 })).toEqual([
      { label: "티켓 관리", href: "/tickets" },
      { label: "설정", href: "/settings" },
    ]);
  });

  it("shows an agent who created no booth settings only", () => {
    expect(getMenuItems({ role: "VALET_AGENT", managedBoothId: null })).toEqual([
      { label: "설정", href: "/settings" },
    ]);
  });
});
