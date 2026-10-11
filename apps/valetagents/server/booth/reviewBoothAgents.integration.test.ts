import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { reviewBoothAgents as ReviewBoothAgents } from "./reviewBoothAgents";
import type { saveAgentRequest as SaveAgentRequest } from "./saveAgentRequest";
import type { BoothAgentStatus, PrismaClient } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

let prisma: PrismaClient;
let reviewBoothAgents: typeof ReviewBoothAgents;
let saveAgentRequest: typeof SaveAgentRequest;
let managerId: number;
let boothId: number;
let otherBoothId: number;
let agentIds: number[];
const fixtureIds = { booth: [] as number[], staff: [] as number[] };

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for booth agent integration tests");

  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to mutate database without a test name: ${databaseName}`);
  }
  return value;
};

const createMembership = async (staffId: number, status: BoothAgentStatus, targetBoothId = boothId) => {
  const membership = await prisma.boothAgent.create({
    data: { boothId: targetBoothId, staffId, status },
    select: { id: true, updatedAt: true },
  });
  return { id: membership.id, updatedAt: membership.updatedAt.toISOString() };
};

const statusOf = async (membershipId: number) =>
  (await prisma.boothAgent.findUniqueOrThrow({ where: { id: membershipId }, select: { status: true } }))
    .status;

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ reviewBoothAgents } = await import("./reviewBoothAgents"));
  ({ saveAgentRequest } = await import("./saveAgentRequest"));

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const createStaff = async (label: string) =>
    (
      await prisma.staff.create({
        data: { role: "VALET_AGENT", name: `integration-${label}-${suffix}` },
        select: { id: true },
      })
    ).id;
  const createBooth = async (label: string, creatorId: number) =>
    (
      await prisma.booth.create({
        data: { creatorId, name: `integration-${label}-${suffix}`, address: "서울시 테스트구" },
        select: { id: true },
      })
    ).id;

  managerId = await createStaff("manager");
  const otherManagerId = await createStaff("other-manager");
  agentIds = [await createStaff("agent-a"), await createStaff("agent-b")];
  boothId = await createBooth("booth", managerId);
  otherBoothId = await createBooth("other-booth", otherManagerId);
  fixtureIds.staff.push(managerId, otherManagerId, ...agentIds);
  fixtureIds.booth.push(boothId, otherBoothId);
});

beforeEach(async () => {
  await prisma.boothAgent.deleteMany({ where: { boothId: { in: fixtureIds.booth } } });
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.boothAgent.deleteMany({ where: { boothId: { in: fixtureIds.booth } } });
  await prisma.booth.deleteMany({ where: { id: { in: fixtureIds.booth } } });
  await prisma.staff.deleteMany({ where: { id: { in: fixtureIds.staff } } });
  await prisma.$disconnect();
});

describe("reviewBoothAgents database integration", () => {
  it("approves every selected request at once", async () => {
    const first = await createMembership(agentIds[0], "REQUESTED");
    const second = await createMembership(agentIds[1], "REJECTED");

    await expect(
      reviewBoothAgents(managerId, boothId, { status: "APPROVED", agents: [first, second] }),
    ).resolves.toEqual({ ok: true });

    expect(await statusOf(first.id)).toBe("APPROVED");
    expect(await statusOf(second.id)).toBe("APPROVED");
  });

  it("rejects a pending request", async () => {
    const pending = await createMembership(agentIds[0], "REQUESTED");

    await expect(
      reviewBoothAgents(managerId, boothId, { status: "REJECTED", agents: [pending] }),
    ).resolves.toEqual({ ok: true });

    expect(await statusOf(pending.id)).toBe("REJECTED");
  });

  it("never rejects an approved agent, and changes nobody selected with one", async () => {
    const pending = await createMembership(agentIds[0], "REQUESTED");
    const approved = await createMembership(agentIds[1], "APPROVED");

    await expect(
      reviewBoothAgents(managerId, boothId, { status: "REJECTED", agents: [pending, approved] }),
    ).resolves.toEqual({ ok: false, reason: "AGENT_ALREADY_APPROVED" });

    expect(await statusOf(pending.id)).toBe("REQUESTED");
    expect(await statusOf(approved.id)).toBe("APPROVED");
  });

  it("leaves an agent already in the requested status untouched", async () => {
    const approved = await createMembership(agentIds[0], "APPROVED");

    await expect(
      reviewBoothAgents(managerId, boothId, { status: "APPROVED", agents: [approved] }),
    ).resolves.toEqual({ ok: true });

    const row = await prisma.boothAgent.findUniqueOrThrow({
      where: { id: approved.id },
      select: { updatedAt: true },
    });
    expect(row.updatedAt.toISOString()).toBe(approved.updatedAt);
  });

  it("changes nothing when the agent edited the request after the manager loaded the list", async () => {
    const untouched = await createMembership(agentIds[0], "REQUESTED");
    const edited = await createMembership(agentIds[1], "REQUESTED");
    const saved = await saveAgentRequest(agentIds[1], boothId, {
      workStartTime: "22:00",
      workEndTime: "06:00",
    });
    expect(saved.ok).toBe(true);

    await expect(
      reviewBoothAgents(managerId, boothId, { status: "APPROVED", agents: [untouched, edited] }),
    ).resolves.toEqual({ ok: false, reason: "AGENT_CHANGED" });

    expect(await statusOf(untouched.id)).toBe("REQUESTED");
    expect(await statusOf(edited.id)).toBe("REQUESTED");
  });

  it("does not let an approved agent be re-requested by a stale agent save", async () => {
    const pending = await createMembership(agentIds[0], "REQUESTED");
    await reviewBoothAgents(managerId, boothId, { status: "APPROVED", agents: [pending] });

    await expect(
      saveAgentRequest(agentIds[0], boothId, { workStartTime: "09:00", workEndTime: "18:00" }),
    ).resolves.toEqual({ ok: false, reason: "ALREADY_APPROVED" });
    expect(await statusOf(pending.id)).toBe("APPROVED");
  });

  it("only lets the booth creator review, and only that booth's agents", async () => {
    const pending = await createMembership(agentIds[0], "REQUESTED");
    const elsewhere = await createMembership(agentIds[1], "REQUESTED", otherBoothId);

    await expect(
      reviewBoothAgents(agentIds[0], boothId, { status: "APPROVED", agents: [pending] }),
    ).resolves.toEqual({ ok: false, reason: "BOOTH_MANAGER_REQUIRED" });
    await expect(
      reviewBoothAgents(managerId, boothId, { status: "APPROVED", agents: [pending, elsewhere] }),
    ).resolves.toEqual({ ok: false, reason: "AGENT_NOT_FOUND" });

    expect(await statusOf(pending.id)).toBe("REQUESTED");
    expect(await statusOf(elsewhere.id)).toBe("REQUESTED");
  });
});
