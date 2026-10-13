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
    ["MERCHANT_ADMIN", [], "MERCHANT_REGISTRATION_REQUIRED"],
    ["VALET_AGENT", [], "BOOTH_REQUIRED"],
    ["VALET_AGENT", ["REQUESTED"], "AWAITING_APPROVAL"],
    ["VALET_AGENT", ["REJECTED"], "AWAITING_APPROVAL"],
    ["VALET_AGENT", ["REJECTED", "APPROVED"], "COMPLETE"],
  ] as const)("maps %s and %j to %s", (role, statuses, expected) => {
    expect(deriveOnboardingState(role, [...statuses])).toBe(expected);
  });

  it.each([
    [[], "MERCHANT_REGISTRATION_REQUIRED"],
    [[[]], "MERCHANT_APPROVAL_PENDING"],
    [[[] as ("PENDING" | "APPROVED" | "REJECTED")[], ["REJECTED"]], "MERCHANT_APPROVAL_PENDING"],
    [[["PENDING"], ["APPROVED"]], "COMPLETE"],
  ] as const)("derives merchant contracts %j as %s", (statuses, expected) => {
    expect(deriveOnboardingState("MERCHANT_ADMIN", [], statuses.map((item) => [...item]))).toBe(
      expected,
    );
  });
});

describe("getStaffOnboardingState", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null for an inactive staff", async () => {
    database.findFirst.mockResolvedValue(null);
    await expect(getStaffOnboardingState(7)).resolves.toBeNull();
  });

  it("only selects booth fee policies that are already in effect", async () => {
    vi.useFakeTimers({ now: new Date("2026-06-01T00:00:00.000Z") });
    database.findFirst.mockResolvedValue(null);

    try {
      await getStaffOnboardingState(7);
    } finally {
      vi.useRealTimers();
    }

    expect(database.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          boothMemberships: expect.objectContaining({
            select: expect.objectContaining({
              booth: {
                select: expect.objectContaining({
                  feePolicies: expect.objectContaining({
                    where: { effectiveFrom: { lte: new Date("2026-06-01T00:00:00.000Z") } },
                  }),
                }),
              },
            }),
          }),
        }),
      }),
    );
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
      merchants: [],
    });

    const result = await getStaffOnboardingState(7);

    expect(database.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7, deletedAt: null } }),
    );
    expect(result).toMatchObject({ state: "COMPLETE", nextPath: "/" });
    expect(result?.requests.map(({ id }) => id)).toEqual([4, 3, 2, 1]);
  });

  it("does not expose valet requests and reports pending for a merchant without approval", async () => {
    database.findFirst.mockResolvedValue({
      role: "MERCHANT_ADMIN",
      boothMemberships: [membership(1, "REQUESTED", 1)],
      merchants: [{ booths: [{ status: "PENDING" }] }],
    });

    await expect(getStaffOnboardingState(7)).resolves.toMatchObject({
      state: "MERCHANT_APPROVAL_PENDING",
      requests: [],
    });
  });

  it("only qualifies active merchants linked to active booths", async () => {
    database.findFirst.mockResolvedValue({
      role: "MERCHANT_ADMIN",
      boothMemberships: [],
      merchants: [{ booths: [{ status: "APPROVED" }] }],
    });

    await expect(getStaffOnboardingState(7)).resolves.toMatchObject({
      state: "COMPLETE",
      nextPath: "/",
    });
    expect(database.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          merchants: {
            where: { deletedAt: null },
            select: {
              booths: {
                where: { booth: { deletedAt: null } },
                select: { status: true },
              },
            },
          },
        }),
      }),
    );
  });
});
