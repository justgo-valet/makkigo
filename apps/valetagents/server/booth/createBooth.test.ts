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

  it("persists photo paths in their selected order", async () => {
    const transaction = createTransaction();
    database.transaction.mockImplementation((callback) => callback(transaction));

    await expect(createBooth(7, body, ["photo-a.jpg", "photo-b.png"])).resolves.toMatchObject({ ok: true });

    expect(transaction.booth.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          photos: { create: [{ path: "photo-a.jpg", sortOrder: 0 }, { path: "photo-b.png", sortOrder: 1 }] },
        }),
      }),
    );
  });
});
