import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const database = vi.hoisted(() => ({
  findBooth: vi.fn(),
  countAgents: vi.fn(),
  findAgents: vi.fn(),
}));

vi.mock("database", () => ({
  prisma: {
    booth: { findFirst: database.findBooth },
    boothAgent: { count: database.countAgents, findMany: database.findAgents },
  },
}));

import { listBoothAgents } from "./listBoothAgents";

const workTime = (hours: number, minutes = 0) => new Date(Date.UTC(1970, 0, 1, hours, minutes));

const agent = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  status: "APPROVED",
  workStartTime: workTime(9, 30),
  workEndTime: workTime(18, 30),
  notificationsEnabled: true,
  updatedAt: new Date("2026-10-10T01:00:00.000Z"),
  staff: { name: "홍길동" },
  ...overrides,
});

// 서울 시각 12:00
const NOON_IN_SEOUL = new Date("2026-10-11T03:00:00.000Z");

describe("listBoothAgents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.findBooth.mockResolvedValue({ creatorId: 7 });
    database.countAgents.mockResolvedValue(0);
    database.findAgents.mockResolvedValue([]);
  });

  it("rejects a missing or deleted booth", async () => {
    database.findBooth.mockResolvedValue(null);

    await expect(listBoothAgents(7, 1, 1)).resolves.toEqual({ ok: false, reason: "BOOTH_NOT_FOUND" });
    expect(database.findBooth).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1, deletedAt: null } }),
    );
    expect(database.findAgents).not.toHaveBeenCalled();
  });

  it("rejects staff who did not create the booth", async () => {
    await expect(listBoothAgents(8, 1, 1)).resolves.toEqual({
      ok: false,
      reason: "BOOTH_MANAGER_REQUIRED",
    });
    expect(database.findAgents).not.toHaveBeenCalled();
  });

  it("pages agents of active staff in registration order", async () => {
    database.countAgents.mockResolvedValue(23);

    const result = await listBoothAgents(7, 1, 3);

    expect(result).toEqual({ ok: true, value: { items: [], page: 3, totalPages: 3 } });
    expect(database.findAgents).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { boothId: 1, staff: { deletedAt: null } },
        orderBy: { id: "asc" },
        skip: 20,
        take: 10,
      }),
    );
  });

  it("reports one page when nobody has requested yet", async () => {
    await expect(listBoothAgents(7, 1, 1)).resolves.toEqual({
      ok: true,
      value: { items: [], page: 1, totalPages: 1 },
    });
  });

  it("serializes work time and marks approved agents inside their shift as working", async () => {
    database.countAgents.mockResolvedValue(1);
    database.findAgents.mockResolvedValue([agent()]);

    const result = await listBoothAgents(7, 1, 1, NOON_IN_SEOUL);

    expect(result).toEqual({
      ok: true,
      value: {
        items: [
          {
            id: 1,
            name: "홍길동",
            status: "APPROVED",
            workStartTime: "09:30",
            workEndTime: "18:30",
            working: true,
            updatedAt: "2026-10-10T01:00:00.000Z",
          },
        ],
        page: 1,
        totalPages: 1,
      },
    });
  });

  it.each([
    ["is not approved yet", { status: "REQUESTED" }],
    ["turned notifications off", { notificationsEnabled: false }],
    ["is outside the shift", { workStartTime: workTime(13), workEndTime: workTime(18) }],
    ["has no work time", { workStartTime: null, workEndTime: null }],
  ])("does not mark an agent as working when the agent %s", async (_label, overrides) => {
    database.countAgents.mockResolvedValue(1);
    database.findAgents.mockResolvedValue([agent(overrides)]);

    const result = await listBoothAgents(7, 1, 1, NOON_IN_SEOUL);

    expect(result.ok && result.value.items[0].working).toBe(false);
  });
});
