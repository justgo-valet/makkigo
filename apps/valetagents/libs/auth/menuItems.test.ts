import { describe, expect, it } from "vitest";

import { getMenuItems } from "./menuItems";

describe("getMenuItems", () => {
  it("sends a booth manager to the agent and merchant management of the booth they created", () => {
    expect(getMenuItems({ role: "VALET_AGENT", managedBoothId: 3 })).toEqual([
      { label: "요원 관리", href: "/booths/3/agents" },
      { label: "업체 관리", href: "/booths/3/merchants" },
      { label: "요금 · 계좌", href: "/booths/3/payment-settings" },
      { label: "설정", href: "/settings" },
    ]);
  });

  it("puts the history of the joined booth first for an approved agent", () => {
    expect(getMenuItems({ role: "VALET_AGENT", managedBoothId: null, agentBoothId: 5 })).toEqual([
      { label: "집계", href: "/booths/5/history" },
      { label: "설정", href: "/settings" },
    ]);
    expect(getMenuItems({ role: "VALET_AGENT", managedBoothId: 3, agentBoothId: 3 })[0]).toEqual({
      label: "집계",
      href: "/booths/3/history",
    });
  });

  it("shows a merchant admin ticket management, QR codes and settings", () => {
    expect(getMenuItems({ role: "MERCHANT_ADMIN", managedBoothId: 3 })).toEqual([
      { label: "티켓 관리", href: "/tickets" },
      { label: "QR 코드", href: "/merchants/qr" },
      { label: "설정", href: "/settings" },
    ]);
  });

  it("shows an agent who created no booth settings only", () => {
    expect(getMenuItems({ role: "VALET_AGENT", managedBoothId: null })).toEqual([
      { label: "설정", href: "/settings" },
    ]);
  });

  it("shows settings only while the staff is still onboarding", () => {
    expect(getMenuItems({ role: "MERCHANT_ADMIN", managedBoothId: null, onboarding: true })).toEqual([
      { label: "설정", href: "/settings" },
    ]);
  });
});
