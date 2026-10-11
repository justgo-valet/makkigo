import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const database = vi.hoisted(() => ({ transaction: vi.fn() }));

vi.mock("database", () => ({
  Prisma: { TransactionIsolationLevel: { Serializable: "Serializable" } },
  prisma: { $transaction: database.transaction },
}));

import { createBooth } from "./createBooth";

const createTransaction = () => ({
  staff: { findFirst: vi.fn().mockResolvedValue({ role: "VALET_AGENT", boothMemberships: [] }) },
  booth: { create: vi.fn().mockResolvedValue({ id: 3 }) },
});

const body = { name: "시청 부스", address: "서울특별시 중구 세종대로 110", addressDetail: null };

describe("createBooth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates the booth with its creator as an approved agent in one serializable transaction", async () => {
    const transaction = createTransaction();
    database.transaction.mockImplementation((callback) => callback(transaction));

    await expect(createBooth(7, body)).resolves.toEqual({ ok: true, value: { id: 3 } });

    expect(database.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
    expect(transaction.staff.findFirst).toHaveBeenCalledWith({
      where: { id: 7, deletedAt: null },
      select: {
        role: true,
        boothMemberships: { where: { booth: { deletedAt: null } }, select: { status: true } },
      },
    });
    expect(transaction.booth.create).toHaveBeenCalledWith({
      data: {
        name: "시청 부스",
        address: "서울특별시 중구 세종대로 110",
        addressDetail: null,
        creatorId: 7,
        agents: { create: { staffId: 7, status: "APPROVED" } },
      },
      select: { id: true },
    });
  });

  it.each([
    [null, "AUTH_REQUIRED"],
    [{ role: null, boothMemberships: [] }, "VALET_AGENT_REQUIRED"],
    [{ role: "MERCHANT_ADMIN", boothMemberships: [] }, "VALET_AGENT_REQUIRED"],
    [
      { role: "VALET_AGENT", boothMemberships: [{ status: "REQUESTED" }, { status: "APPROVED" }] },
      "ALREADY_ONBOARDED",
    ],
  ] as const)("refuses staff %j with %s and creates nothing", async (staff, reason) => {
    const transaction = createTransaction();
    transaction.staff.findFirst.mockResolvedValue(staff);
    database.transaction.mockImplementation((callback) => callback(transaction));

    await expect(createBooth(7, body)).resolves.toEqual({ ok: false, reason });
    expect(transaction.booth.create).not.toHaveBeenCalled();
  });

  it("lets an agent whose requests are all pending or rejected create a booth", async () => {
    const transaction = createTransaction();
    transaction.staff.findFirst.mockResolvedValue({
      role: "VALET_AGENT",
      boothMemberships: [{ status: "REQUESTED" }, { status: "REJECTED" }],
    });
    database.transaction.mockImplementation((callback) => callback(transaction));

    await expect(createBooth(7, body)).resolves.toEqual({ ok: true, value: { id: 3 } });
  });

  it("retries serialization failures at most three times", async () => {
    database.transaction.mockRejectedValue(Object.assign(new Error("conflict"), { code: "P2034" }));

    await expect(createBooth(7, body)).resolves.toEqual({ ok: false, reason: "REQUEST_CONFLICT" });
    expect(database.transaction).toHaveBeenCalledTimes(3);
  });

  it("retries a serialization failure that the driver raised at commit", async () => {
    const transaction = createTransaction();
    database.transaction
      .mockRejectedValueOnce(
        Object.assign(new Error("TransactionWriteConflict"), {
          cause: { kind: "TransactionWriteConflict" },
        }),
      )
      .mockImplementation((callback) => callback(transaction));

    await expect(createBooth(7, body)).resolves.toEqual({ ok: true, value: { id: 3 } });
    expect(database.transaction).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["a unique violation", Object.assign(new Error("unique"), { code: "P2002" })],
    ["an unrelated error", new Error("database down")],
  ])("does not retry %s", async (_label, error) => {
    database.transaction.mockRejectedValue(error);

    await expect(createBooth(7, body)).rejects.toBe(error);
    expect(database.transaction).toHaveBeenCalledTimes(1);
  });
});
