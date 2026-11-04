import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { withdrawStaff as WithdrawStaff } from "./withdrawStaff";
import type { PrismaClient, StaffRole } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

let prisma: PrismaClient;
let withdrawStaff: typeof WithdrawStaff;
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const fixtureIds = { staff: [] as number[], booth: [] as number[], merchant: [] as number[] };

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for withdraw integration tests");

  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to mutate database without a test name: ${databaseName}`);
  }
  return value;
};

const createStaff = async (role: StaffRole, label: string) => {
  const staff = await prisma.staff.create({
    data: {
      role,
      name: `integration-withdraw-${label}-${suffix}`,
      socialAccounts: {
        create: { provider: "KAKAO", providerUserId: `withdraw-${label}-${suffix}` },
      },
      refreshTokens: {
        create: {
          tokenHash: `${label}-${suffix}`.padEnd(64, "0").slice(0, 64),
          expiresAt: new Date(Date.now() + 60_000),
        },
      },
      pushDevices: { create: { platform: "ANDROID", token: `withdraw-${label}-${suffix}` } },
      notifications: { create: { type: "ARRIVAL", title: "도착 알림", body: "12가3456" } },
    },
    select: { id: true },
  });
  fixtureIds.staff.push(staff.id);
  return staff.id;
};

const createBooth = async (creatorId: number, label: string) => {
  const booth = await prisma.booth.create({
    data: { creatorId, name: `integration-withdraw-${label}-${suffix}`, address: "서울시" },
    select: { id: true },
  });
  fixtureIds.booth.push(booth.id);
  return booth.id;
};

const createMerchant = async (adminId: number, label: string) => {
  const merchant = await prisma.merchant.create({
    data: { adminId, name: `integration-withdraw-${label}-${suffix}`, address: "서울시" },
    select: { id: true },
  });
  fixtureIds.merchant.push(merchant.id);
  return merchant.id;
};

const readStaff = (staffId: number) =>
  prisma.staff.findUniqueOrThrow({
    where: { id: staffId },
    select: {
      deletedAt: true,
      _count: { select: { socialAccounts: true, pushDevices: true, notifications: true } },
      refreshTokens: { select: { revokedAt: true } },
    },
  });

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ withdrawStaff } = await import("./withdrawStaff"));
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.valetSession.deleteMany({ where: { merchantId: { in: fixtureIds.merchant } } });
  await prisma.merchant.deleteMany({ where: { id: { in: fixtureIds.merchant } } });
  await prisma.booth.deleteMany({ where: { id: { in: fixtureIds.booth } } });
  await prisma.staff.deleteMany({ where: { id: { in: fixtureIds.staff } } });
  await prisma.$disconnect();
});

describe("withdrawStaff database integration", () => {
  it("signs the agent out everywhere and removes their personal data but keeps membership", async () => {
    const managerId = await createStaff("VALET_AGENT", "agent-manager");
    const boothId = await createBooth(managerId, "agent-booth");
    const agentId = await createStaff("VALET_AGENT", "agent");
    await prisma.boothAgent.create({ data: { boothId, staffId: agentId, status: "APPROVED" } });

    await expect(withdrawStaff(agentId)).resolves.toEqual({ ok: true });

    const staff = await readStaff(agentId);
    expect(staff.deletedAt).not.toBeNull();
    expect(staff._count).toEqual({ socialAccounts: 0, pushDevices: 0, notifications: 0 });
    expect(staff.refreshTokens.every(({ revokedAt }) => revokedAt !== null)).toBe(true);
    await expect(prisma.boothAgent.count({ where: { staffId: agentId } })).resolves.toBe(1);
    await expect(prisma.booth.findUniqueOrThrow({ where: { id: boothId } })).resolves.toMatchObject(
      { deletedAt: null },
    );
  });

  it("closes the booth and merchants the staff manages", async () => {
    const managerId = await createStaff("VALET_AGENT", "manager");
    const boothId = await createBooth(managerId, "manager-booth");
    const adminId = await createStaff("MERCHANT_ADMIN", "admin");
    const merchantId = await createMerchant(adminId, "admin-merchant");

    await expect(withdrawStaff(managerId)).resolves.toEqual({ ok: true });
    await expect(withdrawStaff(adminId)).resolves.toEqual({ ok: true });

    const booth = await prisma.booth.findUniqueOrThrow({ where: { id: boothId } });
    const merchant = await prisma.merchant.findUniqueOrThrow({ where: { id: merchantId } });
    expect(booth.deletedAt).not.toBeNull();
    expect(merchant.deletedAt).not.toBeNull();
  });

  it("refuses while a car is on its way to a merchant contracted with the closing booth", async () => {
    const managerId = await createStaff("VALET_AGENT", "busy-manager");
    const boothId = await createBooth(managerId, "busy-booth");
    const adminId = await createStaff("MERCHANT_ADMIN", "busy-admin");
    const merchantId = await createMerchant(adminId, "busy-merchant");
    await prisma.boothMerchant.create({ data: { boothId, merchantId, status: "APPROVED" } });
    await prisma.valetSession.create({
      data: { status: "ARRIVING", plateNumber: `99가${suffix.slice(-4)}`, merchantId },
    });

    await expect(withdrawStaff(managerId)).resolves.toEqual({
      ok: false,
      reason: "ACTIVE_VALET_SESSION",
    });

    const staff = await readStaff(managerId);
    const booth = await prisma.booth.findUniqueOrThrow({ where: { id: boothId } });
    expect(staff.deletedAt).toBeNull();
    expect(staff._count).toEqual({ socialAccounts: 1, pushDevices: 1, notifications: 1 });
    expect(booth.deletedAt).toBeNull();
  });
});
