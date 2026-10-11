import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { listBoothMerchants as ListBoothMerchants } from "./listBoothMerchants";
import type { reviewBoothMerchants as ReviewBoothMerchants } from "./reviewBoothMerchants";
import type { BoothMerchantStatus, PrismaClient } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;
const MISSING_ID = 2_147_483_647;
// 계약 행은 이 시각에 마지막으로 바뀐 것으로 만든다. 그 뒤의 변경은 모두 이 값과 다른 updatedAt 을 남긴다.
const LISTED_AT = "2026-10-01T00:00:00.000Z";

let prisma: PrismaClient;
let listBoothMerchants: typeof ListBoothMerchants;
let reviewBoothMerchants: typeof ReviewBoothMerchants;
let suffix: string;
let managerId: number;
let otherManagerId: number;
let merchantAdminId: number;
let boothId: number;
let otherBoothId: number;
let deletedBoothId: number;
const fixtureIds = { booth: [] as number[], staff: [] as number[], merchant: [] as number[] };

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for booth merchant integration tests");

  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to mutate database without a test name: ${databaseName}`);
  }
  return value;
};

// 업체 픽스처는 이 함수로만 만든다. merchants 에 필수 컬럼이 늘면 여기만 고친다.
const createMerchant = async (label: string, deletedAt?: Date) => {
  const merchant = await prisma.merchant.create({
    data: {
      adminId: merchantAdminId,
      name: `integration-${label}-${suffix}`,
      address: "서울시 테스트구",
      deletedAt,
    },
    select: { id: true },
  });
  fixtureIds.merchant.push(merchant.id);
  return merchant.id;
};

const createContract = async (
  label: string,
  status: BoothMerchantStatus,
  overrides: { boothId?: number; deletedAt?: Date } = {},
) => {
  const merchantId = await createMerchant(label, overrides.deletedAt);
  await prisma.boothMerchant.create({
    data: { boothId: overrides.boothId ?? boothId, merchantId, status, updatedAt: LISTED_AT },
  });
  return { id: merchantId, updatedAt: LISTED_AT };
};

const contractOf = async (merchantId: number, targetBoothId = boothId) => {
  const contract = await prisma.boothMerchant.findUniqueOrThrow({
    where: { boothId_merchantId: { boothId: targetBoothId, merchantId } },
    select: { status: true, updatedAt: true },
  });
  return { status: contract.status, updatedAt: contract.updatedAt.toISOString() };
};

const createDeferred = <T = void>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
};

const waitForWaiters = async (lockHolderPid: number, expected: number) => {
  const deadline = Date.now() + 5_000;

  while (Date.now() < deadline) {
    const sessions = await prisma.$queryRaw<{ pid: number; blockers: number[] }[]>`
      SELECT pid, pg_blocking_pids(pid) AS blockers
      FROM pg_stat_activity
      WHERE datname = current_database() AND cardinality(pg_blocking_pids(pid)) > 0
    `;
    // 두 번째로 기다리는 요청은 잠금을 쥔 쪽이 아니라 먼저 기다리던 요청 뒤에 선다.
    const waiting = new Set([lockHolderPid]);
    for (let found = true; found; ) {
      found = false;
      for (const { pid, blockers } of sessions) {
        if (!waiting.has(pid) && blockers.some((blocker) => waiting.has(blocker))) {
          waiting.add(pid);
          found = true;
        }
      }
    }
    if (waiting.size - 1 >= expected) return;
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  throw new Error(`Timed out waiting for ${expected} reviews blocked behind PID ${lockHolderPid}`);
};

// 계약 행 하나를 잠가 둔 채 두 요청을 시작하고, 둘 다 그 잠금 뒤에 선 것을 확인한 다음에 푼다.
// 그래서 두 요청은 반드시 같은 행 상태를 읽은 뒤에 겹쳐서 쓴다.
const reviewTogether = async (
  lockedMerchantId: number,
  bodies: [Parameters<typeof reviewBoothMerchants>[2], Parameters<typeof reviewBoothMerchants>[2]],
) => {
  const locked = createDeferred<number>();
  const release = createDeferred();

  const lockHolder = prisma.$transaction(async (transaction) => {
    const [connection] = await transaction.$queryRaw<[{ pid: number }]>`
      SELECT pg_backend_pid() AS pid
      FROM booth_merchants
      WHERE booth_id = ${boothId} AND merchant_id = ${lockedMerchantId}
      FOR UPDATE
    `;
    if (!connection) throw new Error("Could not lock the contract row");
    locked.resolve(connection.pid);
    await release.promise;
  });

  const lockHolderPid = await locked.promise;
  const reviews = bodies.map((body) => reviewBoothMerchants(managerId, boothId, body));

  try {
    await waitForWaiters(lockHolderPid, reviews.length);
  } finally {
    release.resolve();
  }

  await lockHolder;
  return Promise.allSettled(reviews);
};

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ listBoothMerchants } = await import("./listBoothMerchants"));
  ({ reviewBoothMerchants } = await import("./reviewBoothMerchants"));

  suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const createStaff = async (label: string, role: "VALET_AGENT" | "MERCHANT_ADMIN") =>
    (
      await prisma.staff.create({
        data: { role, name: `integration-${label}-${suffix}` },
        select: { id: true },
      })
    ).id;
  const createBooth = async (label: string, creatorId: number, deletedAt?: Date) =>
    (
      await prisma.booth.create({
        data: { creatorId, name: `integration-${label}-${suffix}`, address: "서울시 테스트구", deletedAt },
        select: { id: true },
      })
    ).id;

  managerId = await createStaff("manager", "VALET_AGENT");
  otherManagerId = await createStaff("other-manager", "VALET_AGENT");
  merchantAdminId = await createStaff("merchant-admin", "MERCHANT_ADMIN");
  boothId = await createBooth("booth", managerId);
  otherBoothId = await createBooth("other-booth", otherManagerId);
  deletedBoothId = await createBooth("deleted-booth", managerId, new Date());
  fixtureIds.staff.push(managerId, otherManagerId, merchantAdminId);
  fixtureIds.booth.push(boothId, otherBoothId, deletedBoothId);
});

beforeEach(async () => {
  await prisma.merchant.deleteMany({ where: { id: { in: fixtureIds.merchant } } });
  fixtureIds.merchant.length = 0;
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.merchant.deleteMany({ where: { id: { in: fixtureIds.merchant } } });
  await prisma.booth.deleteMany({ where: { id: { in: fixtureIds.booth } } });
  await prisma.staff.deleteMany({ where: { id: { in: fixtureIds.staff } } });
  await prisma.$disconnect();
});

describe("reviewBoothMerchants database integration", () => {
  it("approves every selected contract at once, pending or rejected", async () => {
    const pending = await createContract("pending", "PENDING");
    const rejected = await createContract("rejected", "REJECTED");

    await expect(
      reviewBoothMerchants(managerId, boothId, { status: "APPROVED", merchants: [pending, rejected] }),
    ).resolves.toEqual({ ok: true });

    expect((await contractOf(pending.id)).status).toBe("APPROVED");
    expect((await contractOf(rejected.id)).status).toBe("APPROVED");
  });

  it("rejects a pending contract", async () => {
    const pending = await createContract("pending", "PENDING");

    await expect(
      reviewBoothMerchants(managerId, boothId, { status: "REJECTED", merchants: [pending] }),
    ).resolves.toEqual({ ok: true });

    expect((await contractOf(pending.id)).status).toBe("REJECTED");
  });

  it("approves a contract it rejected earlier", async () => {
    const pending = await createContract("pending", "PENDING");
    await reviewBoothMerchants(managerId, boothId, { status: "REJECTED", merchants: [pending] });
    const rejected = { id: pending.id, updatedAt: (await contractOf(pending.id)).updatedAt };

    await expect(
      reviewBoothMerchants(managerId, boothId, { status: "APPROVED", merchants: [rejected] }),
    ).resolves.toEqual({ ok: true });

    expect((await contractOf(pending.id)).status).toBe("APPROVED");
  });

  it("never rejects an approved merchant, and changes nobody selected with one", async () => {
    const pending = await createContract("pending", "PENDING");
    const approved = await createContract("approved", "APPROVED");

    await expect(
      reviewBoothMerchants(managerId, boothId, { status: "REJECTED", merchants: [pending, approved] }),
    ).resolves.toEqual({ ok: false, reason: "MERCHANT_ALREADY_APPROVED" });

    expect(await contractOf(pending.id)).toEqual({ status: "PENDING", updatedAt: LISTED_AT });
    expect(await contractOf(approved.id)).toEqual({ status: "APPROVED", updatedAt: LISTED_AT });
  });

  it("moves updatedAt to the moment of approval, and the list reports that value", async () => {
    const pending = await createContract("pending", "PENDING");

    const before = Date.now();
    await reviewBoothMerchants(managerId, boothId, { status: "APPROVED", merchants: [pending] });
    const after = Date.now();

    const stored = await contractOf(pending.id);
    expect(stored.status).toBe("APPROVED");
    expect(new Date(stored.updatedAt).getTime()).toBeGreaterThanOrEqual(before);
    expect(new Date(stored.updatedAt).getTime()).toBeLessThanOrEqual(after);

    const listed = await listBoothMerchants(managerId, boothId, 1);
    expect(listed.ok && listed.value.items.map(({ id, status, updatedAt }) => ({ id, status, updatedAt }))).toEqual(
      [{ id: pending.id, ...stored }],
    );
  });

  it.each(["APPROVED", "REJECTED"] as const)(
    "leaves a contract that is already %s untouched, updatedAt included",
    async (status) => {
      const contract = await createContract("settled", status);

      await expect(
        reviewBoothMerchants(managerId, boothId, { status, merchants: [contract] }),
      ).resolves.toEqual({ ok: true });

      expect(await contractOf(contract.id)).toEqual({ status, updatedAt: LISTED_AT });
    },
  );

  it("changes nothing when a selected contract changed after the manager loaded the list", async () => {
    await createContract("untouched", "PENDING");
    await createContract("changed", "PENDING");
    const listed = await listBoothMerchants(managerId, boothId, 1);
    if (!listed.ok) throw new Error(`Expected a merchant page, got ${listed.reason}`);
    const [untouched, changed] = listed.value.items.map(({ id, updatedAt }) => ({ id, updatedAt }));

    await prisma.boothMerchant.update({
      where: { boothId_merchantId: { boothId, merchantId: changed.id } },
      data: { status: "REJECTED" },
    });

    await expect(
      reviewBoothMerchants(managerId, boothId, { status: "APPROVED", merchants: [untouched, changed] }),
    ).resolves.toEqual({ ok: false, reason: "MERCHANT_CHANGED" });

    expect(await contractOf(untouched.id)).toEqual({ status: "PENDING", updatedAt: LISTED_AT });
    expect((await contractOf(changed.id)).status).toBe("REJECTED");
  });

  it("lets only one of an overlapping approval and rejection of the same contract through", async () => {
    const pending = await createContract("pending", "PENDING");

    const results = await reviewTogether(pending.id, [
      { status: "APPROVED", merchants: [pending] },
      { status: "REJECTED", merchants: [pending] },
    ]);

    expect(results.map((result) => result.status)).toEqual(["fulfilled", "fulfilled"]);
    const [approval, rejection] = results.map((result) => result.status === "fulfilled" && result.value);
    expect([approval, rejection]).toContainEqual({ ok: true });
    expect([approval, rejection]).toContainEqual({ ok: false, reason: "MERCHANT_CHANGED" });
    expect((await contractOf(pending.id)).status).toBe(
      approval && approval.ok ? "APPROVED" : "REJECTED",
    );
  });

  it("settles overlapping reviews that name the same contracts in opposite order", async () => {
    const first = await createContract("first", "PENDING");
    const second = await createContract("second", "PENDING");

    const results = await reviewTogether(first.id, [
      { status: "APPROVED", merchants: [first, second] },
      { status: "APPROVED", merchants: [second, first] },
    ]);

    expect(results.map((result) => result.status)).toEqual(["fulfilled", "fulfilled"]);
    const values = results.map((result) => result.status === "fulfilled" && result.value);
    expect(values).toContainEqual({ ok: true });
    expect(values).toContainEqual({ ok: false, reason: "MERCHANT_CHANGED" });
    expect((await contractOf(first.id)).status).toBe("APPROVED");
    expect((await contractOf(second.id)).status).toBe("APPROVED");
  });

  it("only lets the booth creator review, whatever the caller's role or contract", async () => {
    const pending = await createContract("pending", "PENDING");

    await expect(
      reviewBoothMerchants(otherManagerId, boothId, { status: "APPROVED", merchants: [pending] }),
    ).resolves.toEqual({ ok: false, reason: "BOOTH_MANAGER_REQUIRED" });
    await expect(
      reviewBoothMerchants(merchantAdminId, boothId, { status: "APPROVED", merchants: [pending] }),
    ).resolves.toEqual({ ok: false, reason: "BOOTH_MANAGER_REQUIRED" });

    expect(await contractOf(pending.id)).toEqual({ status: "PENDING", updatedAt: LISTED_AT });
  });

  it("does not find a merchant that is missing, deleted, or contracted with another booth", async () => {
    const pending = await createContract("pending", "PENDING");
    const deleted = await createContract("deleted", "PENDING", { deletedAt: new Date() });
    const elsewhere = await createContract("elsewhere", "PENDING", { boothId: otherBoothId });
    const missing = { id: MISSING_ID, updatedAt: LISTED_AT };

    for (const stranger of [missing, deleted, elsewhere]) {
      await expect(
        reviewBoothMerchants(managerId, boothId, { status: "APPROVED", merchants: [pending, stranger] }),
      ).resolves.toEqual({ ok: false, reason: "MERCHANT_NOT_FOUND" });
    }

    expect(await contractOf(pending.id)).toEqual({ status: "PENDING", updatedAt: LISTED_AT });
    expect(await contractOf(deleted.id)).toEqual({ status: "PENDING", updatedAt: LISTED_AT });
    expect(await contractOf(elsewhere.id, otherBoothId)).toEqual({
      status: "PENDING",
      updatedAt: LISTED_AT,
    });
  });

  it("does not find a booth that is missing or deleted", async () => {
    const onDeletedBooth = await createContract("on-deleted-booth", "PENDING", { boothId: deletedBoothId });

    await expect(
      reviewBoothMerchants(managerId, MISSING_ID, { status: "APPROVED", merchants: [onDeletedBooth] }),
    ).resolves.toEqual({ ok: false, reason: "BOOTH_NOT_FOUND" });
    await expect(
      reviewBoothMerchants(managerId, deletedBoothId, { status: "APPROVED", merchants: [onDeletedBooth] }),
    ).resolves.toEqual({ ok: false, reason: "BOOTH_NOT_FOUND" });

    expect(await contractOf(onDeletedBooth.id, deletedBoothId)).toEqual({
      status: "PENDING",
      updatedAt: LISTED_AT,
    });
  });
});
