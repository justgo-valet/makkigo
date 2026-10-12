import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { reviewBoothMerchants as ReviewBoothMerchants } from "./reviewBoothMerchants";
import type { BoothMerchantStatus, PrismaClient } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;
const LISTED_AT = "2026-10-01T00:00:00.000Z";

let prisma: PrismaClient;
let reviewBoothMerchants: typeof ReviewBoothMerchants;
let suffix: string;
let managerId: number;
let otherManagerId: number;
let merchantAdminId: number;
let boothId: number;
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

const createMerchant = async (label: string) => {
  const merchant = await prisma.merchant.create({
    data: {
      adminId: merchantAdminId,
      name: `integration-${label}-${suffix}`,
      address: "서울시 테스트구",
    },
    select: { id: true },
  });
  fixtureIds.merchant.push(merchant.id);
  return merchant.id;
};

const createContract = async (label: string, status: BoothMerchantStatus) => {
  const merchantId = await createMerchant(label);
  await prisma.boothMerchant.create({
    data: { boothId, merchantId, status, updatedAt: LISTED_AT },
  });
  return { id: merchantId, updatedAt: LISTED_AT };
};

const contractOf = async (merchantId: number) => {
  const contract = await prisma.boothMerchant.findUniqueOrThrow({
    where: { boothId_merchantId: { boothId, merchantId } },
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
  ({ reviewBoothMerchants } = await import("./reviewBoothMerchants"));

  suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const createStaff = async (label: string, role: "VALET_AGENT" | "MERCHANT_ADMIN") =>
    (
      await prisma.staff.create({
        data: { role, name: `integration-${label}-${suffix}` },
        select: { id: true },
      })
    ).id;

  managerId = await createStaff("manager", "VALET_AGENT");
  otherManagerId = await createStaff("other-manager", "VALET_AGENT");
  merchantAdminId = await createStaff("merchant-admin", "MERCHANT_ADMIN");
  boothId = (
    await prisma.booth.create({
      data: { creatorId: managerId, name: `integration-booth-${suffix}`, address: "서울시 테스트구" },
      select: { id: true },
    })
  ).id;
  fixtureIds.staff.push(managerId, otherManagerId, merchantAdminId);
  fixtureIds.booth.push(boothId);
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

  it("never rejects an approved merchant, and changes nobody selected with one", async () => {
    const pending = await createContract("pending", "PENDING");
    const approved = await createContract("approved", "APPROVED");

    await expect(
      reviewBoothMerchants(managerId, boothId, { status: "REJECTED", merchants: [pending, approved] }),
    ).resolves.toEqual({ ok: false, reason: "MERCHANT_ALREADY_APPROVED" });

    expect(await contractOf(pending.id)).toEqual({ status: "PENDING", updatedAt: LISTED_AT });
    expect(await contractOf(approved.id)).toEqual({ status: "APPROVED", updatedAt: LISTED_AT });
  });

  it("changes nothing when a selected contract changed after the manager loaded the list", async () => {
    const untouched = await createContract("untouched", "PENDING");
    const changed = await createContract("changed", "PENDING");
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

  it("only lets the booth creator review", async () => {
    const pending = await createContract("pending", "PENDING");

    await expect(
      reviewBoothMerchants(otherManagerId, boothId, { status: "APPROVED", merchants: [pending] }),
    ).resolves.toEqual({ ok: false, reason: "BOOTH_MANAGER_REQUIRED" });

    expect(await contractOf(pending.id)).toEqual({ status: "PENDING", updatedAt: LISTED_AT });
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
});
