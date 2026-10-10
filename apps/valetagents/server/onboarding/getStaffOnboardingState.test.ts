import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const database = vi.hoisted(() => ({ findFirst: vi.fn() }));

vi.mock("database", () => ({
  prisma: { staff: { findFirst: database.findFirst } },
}));

import { deriveOnboardingState, getStaffOnboardingState } from "./getStaffOnboardingState";

const booth = {
  id: 10,
  name: "강남 부스",
  address: "서울 강남구",
  addressDetail: null,
  feePolicies: [],
};

const membership = (id: number, status: "REQUESTED" | "APPROVED" | "REJECTED", updated: number) => ({
  id,
  status,
  workStartTime: null,
  workEndTime: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date(updated),
  booth: { ...booth, id: booth.id + id },
});

describe("deriveOnboardingState", () => {
  it.each([
    [null, [], "ROLE_REQUIRED"],
    ["MERCHANT_ADMIN", [], "COMPLETE"],
    ["VALET_AGENT", [], "BOOTH_REQUIRED"],
    ["VALET_AGENT", ["REQUESTED"], "AWAITING_APPROVAL"],
    ["VALET_AGENT", ["REJECTED"], "AWAITING_APPROVAL"],
    ["VALET_AGENT", ["REJECTED", "APPROVED"], "COMPLETE"],
  ] as const)("maps %s and %j to %s", (role, statuses, expected) => {
    expect(deriveOnboardingState(role, [...statuses])).toBe(expected);
  });
});

describe("getStaffOnboardingState", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null for an inactive staff", async () => {
    database.findFirst.mockResolvedValue(null);
    await expect(getStaffOnboardingState(7)).resolves.toBeNull();
  });

  it("orders requests by status, then recent update, and reports any approval as complete", async () => {
    database.findFirst.mockResolvedValue({
      role: "VALET_AGENT",
      boothMemberships: [
        membership(1, "APPROVED", 5),
        membership(2, "REJECTED", 20),
        membership(3, "REQUESTED", 10),
        membership(4, "REQUESTED", 30),
      ],
    });

    const result = await getStaffOnboardingState(7);

    expect(database.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7, deletedAt: null } }),
    );
    expect(result).toMatchObject({ state: "COMPLETE", nextPath: "/" });
    expect(result?.requests.map(({ id }) => id)).toEqual([4, 3, 2, 1]);
  });

  it("does not expose booth requests for a merchant", async () => {
    database.findFirst.mockResolvedValue({
      role: "MERCHANT_ADMIN",
      boothMemberships: [membership(1, "REQUESTED", 1)],
    });

    await expect(getStaffOnboardingState(7)).resolves.toMatchObject({
      state: "COMPLETE",
      requests: [],
    });
  });
});
