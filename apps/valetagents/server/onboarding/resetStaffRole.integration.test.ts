import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { resetStaffRole as ResetStaffRole } from "./resetStaffRole";
import type { PrismaClient, StaffRole } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

let prisma: PrismaClient;
let resetStaffRole: typeof ResetStaffRole;
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const fixtureIds = { staff: [] as number[], booth: [] as number[], merchant: [] as number[] };

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for reset role integration tests");

  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to mutate database without a test name: ${databaseName}`);
  }
  return value;
};

const createStaff = async (role: StaffRole, label: string) => {
  const staff = await prisma.staff.create({
    data: { role, name: `integration-reset-role-${label}-${suffix}` },
    select: { id: true },
  });
  fixtureIds.staff.push(staff.id);
  return staff.id;
};

const createBooth = async (creatorId: number, label: string, deletedAt: Date | null = null) => {
  const booth = await prisma.booth.create({
    data: { creatorId, name: `integration-reset-role-${label}-${suffix}`, address: "서울시", deletedAt },
    select: { id: true },
  });
  fixtureIds.booth.push(booth.id);
  return booth.id;
};

const readRole = async (staffId: number) =>
  (await prisma.staff.findUniqueOrThrow({ where: { id: staffId }, select: { role: true } })).role;

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ resetStaffRole } = await import("./resetStaffRole"));
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.boothAgent.deleteMany({ where: { boothId: { in: fixtureIds.booth } } });
  await prisma.merchant.deleteMany({ where: { id: { in: fixtureIds.merchant } } });
  await prisma.booth.deleteMany({ where: { id: { in: fixtureIds.booth } } });
  await prisma.staff.deleteMany({ where: { id: { in: fixtureIds.staff } } });
  await prisma.$disconnect();
});

describe("resetStaffRole database integration", () => {
  it("clears the role of a staff with no booth request, booth or merchant yet", async () => {
    const ownerId = await createStaff("VALET_AGENT", "closed-owner");
    const closedBoothId = await createBooth(ownerId, "closed", new Date());
    const agentId = await createStaff("VALET_AGENT", "fresh-agent");
    await prisma.boothAgent.create({
      data: { boothId: closedBoothId, staffId: agentId, status: "REQUESTED" },
    });

    await expect(resetStaffRole(agentId)).resolves.toBe(true);
    await expect(readRole(agentId)).resolves.toBeNull();
  });

  it("keeps the role once the agent has asked to join a booth", async () => {
    const ownerId = await createStaff("VALET_AGENT", "owner");
    const boothId = await createBooth(ownerId, "open");
    const agentId = await createStaff("VALET_AGENT", "waiting-agent");
    await prisma.boothAgent.create({ data: { boothId, staffId: agentId, status: "REQUESTED" } });

    await expect(resetStaffRole(agentId)).resolves.toBe(false);
    await expect(readRole(agentId)).resolves.toBe("VALET_AGENT");
  });

  it("keeps the role once the merchant admin has registered a merchant", async () => {
    const adminId = await createStaff("MERCHANT_ADMIN", "admin");
    const merchant = await prisma.merchant.create({
      data: { adminId, name: `integration-reset-role-merchant-${suffix}`, address: "서울시" },
      select: { id: true },
    });
    fixtureIds.merchant.push(merchant.id);

    await expect(resetStaffRole(adminId)).resolves.toBe(false);
    await expect(readRole(adminId)).resolves.toBe("MERCHANT_ADMIN");
  });
});
