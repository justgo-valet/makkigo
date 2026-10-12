import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { createBooth as CreateBooth } from "./createBooth";
import type { getStaffOnboardingState as GetStaffOnboardingState } from "@/server/onboarding/getStaffOnboardingState";
import type { PrismaClient, StaffRole } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;
const DOUBLE_SUBMIT_ROUNDS = 10;

let prisma: PrismaClient;
let createBooth: typeof CreateBooth;
let getStaffOnboardingState: typeof GetStaffOnboardingState;
let otherBoothId: number;
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const fixtureIds = { booth: [] as number[], staff: [] as number[] };

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for booth integration tests");

  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to mutate database without a test name: ${databaseName}`);
  }
  return value;
};

const createStaff = async (role: StaffRole | null, deletedAt: Date | null = null) => {
  const staff = await prisma.staff.create({
    data: { role, deletedAt, name: `integration-create-booth-${suffix}` },
    select: { id: true },
  });
  fixtureIds.staff.push(staff.id);
  return staff.id;
};

const boothBody = (label: string) => ({
  name: `integration-${label}-${suffix}`,
  address: `서울시 테스트구 ${label}-${suffix}`,
  addressDetail: null,
});

const countCreatedBooths = (...staffIds: number[]) =>
  prisma.booth.count({ where: { creatorId: { in: staffIds } } });

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ createBooth } = await import("./createBooth"));
  ({ getStaffOnboardingState } = await import("@/server/onboarding/getStaffOnboardingState"));

  const otherBooth = await prisma.booth.create({
    data: { creatorId: await createStaff("VALET_AGENT"), ...boothBody("other-booth") },
    select: { id: true },
  });
  otherBoothId = otherBooth.id;
  fixtureIds.booth.push(otherBoothId);
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.booth.deleteMany({
    where: { OR: [{ id: { in: fixtureIds.booth } }, { creatorId: { in: fixtureIds.staff } }] },
  });
  await prisma.staff.deleteMany({ where: { id: { in: fixtureIds.staff } } });
  await prisma.$disconnect();
});

describe("createBooth database integration", () => {
  it("creates the booth with its creator as an approved agent and completes onboarding", async () => {
    const staffId = await createStaff("VALET_AGENT");
    const body = { ...boothBody("created"), addressDetail: "1층 로비" };

    const result = await createBooth(staffId, body);
    if (!result.ok) throw new Error(result.reason);

    await expect(
      prisma.booth.findMany({
        where: { creatorId: staffId },
        select: { id: true, name: true, address: true, addressDetail: true },
      }),
    ).resolves.toEqual([{ id: result.value.id, ...body }]);
    await expect(
      prisma.boothAgent.findMany({ where: { staffId }, select: { boothId: true, status: true } }),
    ).resolves.toEqual([{ boothId: result.value.id, status: "APPROVED" }]);
    await expect(getStaffOnboardingState(staffId)).resolves.toMatchObject({ state: "COMPLETE" });
  });

  it("refuses an already onboarded agent without creating a booth", async () => {
    const approvedAgentId = await createStaff("VALET_AGENT");
    await prisma.boothAgent.create({
      data: { boothId: otherBoothId, staffId: approvedAgentId, status: "APPROVED" },
    });

    await expect(createBooth(approvedAgentId, boothBody("approved-agent"))).resolves.toEqual({
      ok: false,
      reason: "ALREADY_ONBOARDED",
    });

    await expect(countCreatedBooths(approvedAgentId)).resolves.toBe(0);
  });

  it("creates exactly one booth when the same agent submits twice at once", async () => {
    for (let round = 0; round < DOUBLE_SUBMIT_ROUNDS; round += 1) {
      const staffId = await createStaff("VALET_AGENT");

      const results = await Promise.all([
        createBooth(staffId, boothBody(`double-a-${round}`)),
        createBooth(staffId, boothBody(`double-b-${round}`)),
      ]);

      expect(results.filter((result) => result.ok)).toHaveLength(1);
      expect(results.filter((result) => !result.ok)).toEqual([
        { ok: false, reason: "ALREADY_ONBOARDED" },
      ]);
      await expect(countCreatedBooths(staffId)).resolves.toBe(1);
      await expect(prisma.boothAgent.count({ where: { staffId } })).resolves.toBe(1);
    }
  });
});
