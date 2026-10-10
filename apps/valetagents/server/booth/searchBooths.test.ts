import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const database = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("database", () => ({
  prisma: { booth: { findMany: database.findMany } },
}));

import { searchBooths } from "./searchBooths";

describe("searchBooths", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters deleted booths and only selects the signed-in staff request", async () => {
    database.findMany.mockResolvedValue([]);

    await expect(searchBooths(7, "강남")).resolves.toEqual({ items: [] });
    expect(database.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take: 20,
        select: expect.objectContaining({
          agents: expect.objectContaining({ where: { staffId: 7 }, take: 1 }),
        }),
      }),
    );
  });

  it("serializes only the newest fee policy and current request", async () => {
    database.findMany.mockResolvedValue([
      {
        id: 1,
        name: "강남 부스",
        address: "서울 강남구",
        addressDetail: null,
        feePolicies: [
          {
            baseMinutes: 30,
            baseFee: 5_000,
            extraUnitMinutes: 10,
            extraUnitFee: 1_000,
            effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
          },
        ],
        agents: [
          {
            id: 4,
            status: "REQUESTED",
            workStartTime: new Date("1970-01-01T22:00:00.000Z"),
            workEndTime: new Date("1970-01-01T06:00:00.000Z"),
            createdAt: new Date("2026-01-02T00:00:00.000Z"),
            updatedAt: new Date("2026-01-03T00:00:00.000Z"),
          },
        ],
      },
    ]);

    await expect(searchBooths(7, "강남")).resolves.toMatchObject({
      items: [
        {
          id: 1,
          feePolicy: { baseFee: 5_000, effectiveFrom: "2026-01-01T00:00:00.000Z" },
          request: { id: 4, workStartTime: "22:00", workEndTime: "06:00" },
        },
      ],
    });
  });
});
