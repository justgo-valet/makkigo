import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const database = vi.hoisted(() => ({ transaction: vi.fn() }));

vi.mock("database", () => ({
  Prisma: { TransactionIsolationLevel: { Serializable: "Serializable" } },
  prisma: { $transaction: database.transaction },
}));

import { saveAgentRequest } from "./saveAgentRequest";

const savedRequest = {
  id: 9,
  status: "REQUESTED",
  workStartTime: new Date("1970-01-01T22:00:00.000Z"),
  workEndTime: new Date("1970-01-01T06:00:00.000Z"),
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  booth: {
    id: 3,
    name: "강남 부스",
    address: "서울 강남구",
    addressDetail: null,
    feePolicies: [],
  },
};

const createTransaction = () => ({
  staff: { findFirst: vi.fn().mockResolvedValue({ role: "VALET_AGENT" }) },
  booth: { findFirst: vi.fn().mockResolvedValue({ id: 3 }) },
  boothAgent: {
    findUnique: vi.fn().mockResolvedValue(null),
    findUniqueOrThrow: vi.fn().mockResolvedValue(savedRequest),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    create: vi.fn().mockResolvedValue({ id: 9 }),
  },
});

const body = { workStartTime: "22:00", workEndTime: "06:00" };

// Prisma 7.10 + adapter-pg 가 던지는 드라이버 어댑터 오류와 같은 모양이다.
const driverAdapterError = (cause: { kind: string; originalCode?: string; originalMessage?: string }) =>
  Object.assign(new Error(cause.kind), { name: "DriverAdapterError", cause });

// COMMIT 에서 난 PostgreSQL 40001 을 실제 DB 에서 받아 본 값 그대로다. code 속성이 없다.
const commitWriteConflict = () =>
  driverAdapterError({
    originalCode: "40001",
    originalMessage: "could not serialize access due to read/write dependencies among transactions",
    kind: "TransactionWriteConflict",
  });

describe("saveAgentRequest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates one request and lets database defaults own status and notifications", async () => {
    const transaction = createTransaction();
    database.transaction.mockImplementation((callback) => callback(transaction));

    await expect(saveAgentRequest(7, 3, body)).resolves.toMatchObject({
      ok: true,
      value: { outcome: "CREATED", request: { id: 9, workStartTime: "22:00" } },
    });
    expect(transaction.boothAgent.create).toHaveBeenCalledWith({
      data: {
        boothId: 3,
        staffId: 7,
        workStartTime: new Date("1970-01-01T22:00:00.000Z"),
        workEndTime: new Date("1970-01-01T06:00:00.000Z"),
      },
      select: { id: true },
    });
    expect(database.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });

  it.each([
    ["REQUESTED", "UPDATED"],
    ["REJECTED", "REOPENED"],
  ] as const)("conditionally updates %s without overwriting notifications", async (status, outcome) => {
    const transaction = createTransaction();
    transaction.boothAgent.findUnique.mockResolvedValueOnce({ id: 9, status });
    database.transaction.mockImplementation((callback) => callback(transaction));

    await expect(saveAgentRequest(7, 3, body)).resolves.toMatchObject({
      ok: true,
      value: { outcome },
    });
    expect(transaction.boothAgent.updateMany).toHaveBeenCalledWith({
      where: { id: 9, staffId: 7, status: { in: ["REQUESTED", "REJECTED"] } },
      data: {
        status: "REQUESTED",
        workStartTime: new Date("1970-01-01T22:00:00.000Z"),
        workEndTime: new Date("1970-01-01T06:00:00.000Z"),
      },
    });
    expect(transaction.boothAgent.create).not.toHaveBeenCalled();
  });

  it("only returns the fee policy that is already in effect", async () => {
    vi.useFakeTimers({ now: new Date("2026-06-01T00:00:00.000Z") });
    const transaction = createTransaction();
    database.transaction.mockImplementation((callback) => callback(transaction));

    try {
      await saveAgentRequest(7, 3, body);
    } finally {
      vi.useRealTimers();
    }

    expect(transaction.boothAgent.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
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
    );
  });

  it("never modifies an approved request", async () => {
    const transaction = createTransaction();
    transaction.boothAgent.findUnique.mockResolvedValueOnce({ id: 9, status: "APPROVED" });
    database.transaction.mockImplementation((callback) => callback(transaction));

    await expect(saveAgentRequest(7, 3, body)).resolves.toEqual({
      ok: false,
      reason: "ALREADY_APPROVED",
    });
    expect(transaction.boothAgent.updateMany).not.toHaveBeenCalled();
    expect(transaction.boothAgent.create).not.toHaveBeenCalled();
  });

  it("rechecks staff role and active booth inside the serializable transaction", async () => {
    const noRole = createTransaction();
    noRole.staff.findFirst.mockResolvedValue({ role: "MERCHANT_ADMIN" });
    database.transaction.mockImplementationOnce((callback) => callback(noRole));
    await expect(saveAgentRequest(7, 3, body)).resolves.toEqual({
      ok: false,
      reason: "VALET_AGENT_REQUIRED",
    });

    const noBooth = createTransaction();
    noBooth.booth.findFirst.mockResolvedValue(null);
    database.transaction.mockImplementationOnce((callback) => callback(noBooth));
    await expect(saveAgentRequest(7, 3, body)).resolves.toEqual({
      ok: false,
      reason: "BOOTH_NOT_FOUND",
    });
  });

  it("retries transaction conflicts at most three times", async () => {
    database.transaction.mockRejectedValue(Object.assign(new Error("conflict"), { code: "P2034" }));

    await expect(saveAgentRequest(7, 3, body)).resolves.toEqual({
      ok: false,
      reason: "REQUEST_CONFLICT",
    });
    expect(database.transaction).toHaveBeenCalledTimes(3);
  });

  it("retries a serialization failure raised at commit", async () => {
    const transaction = createTransaction();
    database.transaction
      .mockImplementation((callback) => callback(transaction))
      .mockRejectedValueOnce(commitWriteConflict());

    await expect(saveAgentRequest(7, 3, body)).resolves.toMatchObject({
      ok: true,
      value: { outcome: "CREATED" },
    });
    expect(database.transaction).toHaveBeenCalledTimes(2);
  });

  it("stops retrying commit-time serialization failures after three attempts", async () => {
    database.transaction.mockRejectedValue(commitWriteConflict());

    await expect(saveAgentRequest(7, 3, body)).resolves.toEqual({
      ok: false,
      reason: "REQUEST_CONFLICT",
    });
    expect(database.transaction).toHaveBeenCalledTimes(3);
  });

  it("rethrows driver adapter errors that are not write conflicts", async () => {
    const connectionClosed = driverAdapterError({ kind: "ConnectionClosed" });
    database.transaction.mockRejectedValue(connectionClosed);

    await expect(saveAgentRequest(7, 3, body)).rejects.toBe(connectionClosed);
    expect(database.transaction).toHaveBeenCalledTimes(1);
  });
});
