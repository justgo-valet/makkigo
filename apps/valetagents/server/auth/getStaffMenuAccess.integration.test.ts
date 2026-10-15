import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { getStaffMenuAccess as GetStaffMenuAccess } from "./getStaffMenuAccess";
import type { PrismaClient, StaffRole } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

let prisma: PrismaClient;
let getStaffMenuAccess: typeof GetStaffMenuAccess;
let suffix: string;
const fixtureIds = { booth: [] as number[], staff: [] as number[] };

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for staff menu access integration tests");

  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to mutate database without a test name: ${databaseName}`);
  }
  return value;
};

const createStaff = async (label: string, role: StaffRole, deletedAt: Date | null = null) => {
  const { id } = await prisma.staff.create({
    data: { role, name: `integration-${label}-${suffix}`, deletedAt },
    select: { id: true },
  });
  fixtureIds.staff.push(id);
  return id;
};

const createBooth = async (label: string, creatorId: number, deletedAt: Date | null = null) => {
  const { id } = await prisma.booth.create({
    data: { creatorId, name: `integration-${label}-${suffix}`, address: "서울시 테스트구", deletedAt },
    select: { id: true },
  });
  fixtureIds.booth.push(id);
  return id;
};

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ getStaffMenuAccess } = await import("./getStaffMenuAccess"));
  suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.booth.deleteMany({ where: { id: { in: fixtureIds.booth } } });
  await prisma.staff.deleteMany({ where: { id: { in: fixtureIds.staff } } });
  await prisma.$disconnect();
});

describe("getStaffMenuAccess database integration", () => {
  it("returns the smallest booth id an agent created, skipping deleted booths", async () => {
    const managerId = await createStaff("manager", "VALET_AGENT");
    await createBooth("deleted-first", managerId, new Date());
    const firstBoothId = await createBooth("first", managerId);
    await createBooth("second", managerId);

    await expect(getStaffMenuAccess(managerId)).resolves.toEqual({
      role: "VALET_AGENT",
      managedBoothId: firstBoothId,
    });
  });

  it("has no managed booth for an agent who created none", async () => {
    const managerId = await createStaff("other-manager", "VALET_AGENT");
    const agentId = await createStaff("agent", "VALET_AGENT");
    const boothId = await createBooth("joined", managerId);
    await prisma.boothAgent.create({ data: { boothId, staffId: agentId, status: "APPROVED" } });

    await expect(getStaffMenuAccess(agentId)).resolves.toEqual({
      role: "VALET_AGENT",
      managedBoothId: null,
    });
  });

  it("returns null for a missing or deleted staff member", async () => {
    const removedId = await createStaff("removed", "VALET_AGENT");
    await prisma.staff.delete({ where: { id: removedId } });
    const deletedId = await createStaff("deleted", "VALET_AGENT", new Date());

    await expect(getStaffMenuAccess(removedId)).resolves.toBeNull();
    await expect(getStaffMenuAccess(deletedId)).resolves.toBeNull();
  });
});
