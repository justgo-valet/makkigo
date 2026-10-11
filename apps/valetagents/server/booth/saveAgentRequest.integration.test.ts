import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PrismaClient } from "database";
import type { saveAgentRequest as SaveAgentRequest } from "./saveAgentRequest";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

let prisma: PrismaClient;
let saveAgentRequest: typeof SaveAgentRequest;
let creatorId: number;
let agentId: number;
let boothId: number;
const fixtureIds = { booth: [] as number[], staff: [] as number[] };

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for onboarding integration tests");

  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to mutate database without a test name: ${databaseName}`);
  }
  return value;
};

const createDeferred = <T = void>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
};

const createRaceBooth = async (label: string) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const booth = await prisma.booth.create({
    data: { creatorId, name: `integration-${label}-${suffix}`, address: "서울시 테스트구" },
    select: { id: true },
  });
  fixtureIds.booth.push(booth.id);
  return booth.id;
};

const waitForBlockedBy = async (blockingPid: number) => {
  const deadline = Date.now() + 5_000;

  while (Date.now() < deadline) {
    const [state] = await prisma.$queryRaw<[{ blocked: boolean }]>`
      SELECT EXISTS (
        SELECT 1
        FROM pg_stat_activity
        WHERE ${blockingPid} = ANY(pg_blocking_pids(pid))
      ) AS blocked
    `;
    if (state?.blocked) return;
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  throw new Error(`Timed out waiting for a request transaction blocked by PID ${blockingPid}`);
};

const approveWhileRequestIsWaiting = async (
  raceBoothId: number,
  body: Parameters<typeof saveAgentRequest>[2],
) => {
  const approvalLocked = createDeferred<number>();
  const releaseApproval = createDeferred();

  const approval = prisma.$transaction(async (transaction) => {
    const [connection] = await transaction.$queryRaw<[{ pid: number }]>`
      SELECT pg_backend_pid() AS pid
    `;
    if (!connection) throw new Error("Could not identify approval transaction connection");

    await transaction.boothAgent.update({
      where: { boothId_staffId: { boothId: raceBoothId, staffId: agentId } },
      data: { status: "APPROVED" },
    });
    approvalLocked.resolve(connection.pid);
    await releaseApproval.promise;
  });

  const blockingPid = await approvalLocked.promise;
  const request = saveAgentRequest(agentId, raceBoothId, body);

  try {
    await waitForBlockedBy(blockingPid);
  } finally {
    releaseApproval.resolve();
  }

  await approval;
  return request;
};

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ saveAgentRequest } = await import("./saveAgentRequest"));

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const creator = await prisma.staff.create({
    data: { role: "MERCHANT_ADMIN", name: `integration-creator-${suffix}` },
    select: { id: true },
  });
  const agent = await prisma.staff.create({
    data: { role: "VALET_AGENT", name: `integration-agent-${suffix}` },
    select: { id: true },
  });
  const booth = await prisma.booth.create({
    data: {
      creatorId: creator.id,
      name: `integration-booth-${suffix}`,
      address: "서울시 테스트구",
    },
    select: { id: true },
  });

  creatorId = creator.id;
  agentId = agent.id;
  boothId = booth.id;
  fixtureIds.staff.push(creatorId, agentId);
  fixtureIds.booth.push(boothId);
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.boothAgent.deleteMany({ where: { boothId: { in: fixtureIds.booth } } });
  await prisma.boothFeePolicy.deleteMany({ where: { boothId: { in: fixtureIds.booth } } });
  await prisma.booth.deleteMany({ where: { id: { in: fixtureIds.booth } } });
  await prisma.staff.deleteMany({ where: { id: { in: fixtureIds.staff } } });
  await prisma.$disconnect();
});

describe("saveAgentRequest database integration", () => {
  it("creates, updates, and reopens the same membership row", async () => {
    const created = await saveAgentRequest(agentId, boothId, {
      workStartTime: "22:00",
      workEndTime: "06:00",
    });
    expect(created).toMatchObject({ ok: true, value: { outcome: "CREATED" } });
    if (!created.ok) throw new Error(created.reason);

    const updated = await saveAgentRequest(agentId, boothId, {
      workStartTime: "21:30",
      workEndTime: "05:30",
    });
    expect(updated).toMatchObject({
      ok: true,
      value: { outcome: "UPDATED", request: { id: created.value.request.id } },
    });

    await prisma.boothAgent.update({
      where: { boothId_staffId: { boothId, staffId: agentId } },
      data: { status: "REJECTED", notificationsEnabled: false },
    });
    const reopened = await saveAgentRequest(agentId, boothId, {
      workStartTime: "20:00",
      workEndTime: "04:00",
    });
    expect(reopened).toMatchObject({
      ok: true,
      value: {
        outcome: "REOPENED",
        request: { id: created.value.request.id, status: "REQUESTED" },
      },
    });

    await expect(
      prisma.boothAgent.findUniqueOrThrow({
        where: { boothId_staffId: { boothId, staffId: agentId } },
        select: { notificationsEnabled: true },
      }),
    ).resolves.toEqual({ notificationsEnabled: false });
  });

  it("never changes an approved row", async () => {
    await prisma.boothAgent.update({
      where: { boothId_staffId: { boothId, staffId: agentId } },
      data: { status: "APPROVED" },
    });
    const before = await prisma.boothAgent.findUniqueOrThrow({
      where: { boothId_staffId: { boothId, staffId: agentId } },
    });

    await expect(
      saveAgentRequest(agentId, boothId, { workStartTime: "09:00", workEndTime: "18:00" }),
    ).resolves.toEqual({ ok: false, reason: "ALREADY_APPROVED" });

    const after = await prisma.boothAgent.findUniqueOrThrow({
      where: { boothId_staffId: { boothId, staffId: agentId } },
    });
    expect(after).toEqual(before);
  });

  it("converges simultaneous first requests to one complete time pair", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const booth = await prisma.booth.create({
      data: { creatorId, name: `integration-race-${suffix}`, address: "서울시 테스트구" },
      select: { id: true },
    });
    fixtureIds.booth.push(booth.id);

    const results = await Promise.all([
      saveAgentRequest(agentId, booth.id, { workStartTime: "08:00", workEndTime: "16:00" }),
      saveAgentRequest(agentId, booth.id, { workStartTime: "10:00", workEndTime: "19:00" }),
    ]);

    expect(results.every((result) => result.ok || result.reason === "REQUEST_CONFLICT")).toBe(true);
    const rows = await prisma.boothAgent.findMany({ where: { boothId: booth.id, staffId: agentId } });
    expect(rows).toHaveLength(1);

    const finalPair = [
      rows[0]?.workStartTime?.toISOString().slice(11, 16),
      rows[0]?.workEndTime?.toISOString().slice(11, 16),
    ];
    expect([
      ["08:00", "16:00"],
      ["10:00", "19:00"],
    ]).toContainEqual(finalPair);
  });

  it("does not downgrade approval that races a requested-time update", async () => {
    const raceBoothId = await createRaceBooth("requested-approval-race");
    await expect(
      saveAgentRequest(agentId, raceBoothId, {
        workStartTime: "07:00",
        workEndTime: "15:00",
      }),
    ).resolves.toMatchObject({ ok: true, value: { outcome: "CREATED" } });

    const result = await approveWhileRequestIsWaiting(raceBoothId, {
      workStartTime: "08:30",
      workEndTime: "17:30",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("A racing request unexpectedly replaced an approval");
    expect(["ALREADY_APPROVED", "REQUEST_CONFLICT"]).toContain(result.reason);
    await expect(
      prisma.boothAgent.findUniqueOrThrow({
        where: { boothId_staffId: { boothId: raceBoothId, staffId: agentId } },
        select: { status: true, workStartTime: true, workEndTime: true },
      }),
    ).resolves.toMatchObject({
      status: "APPROVED",
      workStartTime: new Date("1970-01-01T07:00:00.000Z"),
      workEndTime: new Date("1970-01-01T15:00:00.000Z"),
    });
  });

  it("does not downgrade approval that races a rejected-request reopen", async () => {
    const raceBoothId = await createRaceBooth("rejected-approval-race");
    const created = await saveAgentRequest(agentId, raceBoothId, {
      workStartTime: "22:00",
      workEndTime: "06:00",
    });
    expect(created).toMatchObject({ ok: true, value: { outcome: "CREATED" } });
    await prisma.boothAgent.update({
      where: { boothId_staffId: { boothId: raceBoothId, staffId: agentId } },
      data: { status: "REJECTED" },
    });

    const result = await approveWhileRequestIsWaiting(raceBoothId, {
      workStartTime: "21:00",
      workEndTime: "05:00",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("A racing reopen unexpectedly replaced an approval");
    expect(["ALREADY_APPROVED", "REQUEST_CONFLICT"]).toContain(result.reason);
    await expect(
      prisma.boothAgent.findUniqueOrThrow({
        where: { boothId_staffId: { boothId: raceBoothId, staffId: agentId } },
        select: { status: true, workStartTime: true, workEndTime: true },
      }),
    ).resolves.toMatchObject({
      status: "APPROVED",
      workStartTime: new Date("1970-01-01T22:00:00.000Z"),
      workEndTime: new Date("1970-01-01T06:00:00.000Z"),
    });
  });
});
