import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { listMerchantValetSessions as ListMerchantValetSessions } from "./listMerchantValetSessions";
import type { PrismaClient, ValetSessionStatus } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;
const IMAGE_BASE_URL = "https://images.example.com";

let prisma: PrismaClient;
let listMerchantValetSessions: typeof ListMerchantValetSessions;
let suffix: string;
let adminId: number;
let boothId: number;
const staffIds: number[] = [];
const merchantIds: number[] = [];
const sessionIds: number[] = [];

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for valet session integration tests");

  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to mutate database without a test name: ${databaseName}`);
  }
  return value;
};

const createStaff = async (label: string, role: "VALET_AGENT" | "MERCHANT_ADMIN") => {
  const staff = await prisma.staff.create({
    data: { role, name: `integration-${label}-${suffix}` },
    select: { id: true },
  });
  staffIds.push(staff.id);
  return staff.id;
};

const createMerchant = async (merchantAdminId: number, deletedAt: Date | null = null) => {
  const merchant = await prisma.merchant.create({
    data: {
      adminId: merchantAdminId,
      name: `integration-merchant-${suffix}`,
      address: "서울시 테스트구",
      deletedAt,
      booths: { create: { boothId, status: "APPROVED" } },
    },
    select: { id: true },
  });
  merchantIds.push(merchant.id);
  return merchant.id;
};

const createSession = async (status: ValetSessionStatus, merchantId: number) => {
  const session = await prisma.valetSession.create({
    data: { status, plateNumber: "12가3456", merchantId, boothId },
    select: { id: true },
  });
  sessionIds.push(session.id);
  return session.id;
};

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ listMerchantValetSessions } = await import("./listMerchantValetSessions"));

  suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const managerId = await createStaff("manager", "VALET_AGENT");
  adminId = await createStaff("admin", "MERCHANT_ADMIN");
  const booth = await prisma.booth.create({
    data: { creatorId: managerId, name: `integration-booth-${suffix}`, address: "서울시 테스트구" },
    select: { id: true },
  });
  boothId = booth.id;
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.valetSession.deleteMany({ where: { id: { in: sessionIds } } });
  await prisma.merchant.deleteMany({ where: { id: { in: merchantIds } } });
  await prisma.booth.deleteMany({ where: { id: boothId } });
  await prisma.staff.deleteMany({ where: { id: { in: staffIds } } });
  await prisma.$disconnect();
});

describe("listMerchantValetSessions database integration", () => {
  it("lists only cars of merchants the admin runs", async () => {
    const own = await createMerchant(adminId);
    const closed = await createMerchant(adminId, new Date());
    const otherAdminId = await createStaff("other-admin", "MERCHANT_ADMIN");
    const other = await createMerchant(otherAdminId);

    const arriving = await createSession("ARRIVING", own);
    const parked = await createSession("PARKED", own);
    const completed = await createSession("COMPLETED", own);
    await prisma.valetSession.update({ where: { id: completed }, data: { completedAt: new Date() } });
    await createSession("CANCELLED", own);
    await createSession("PARKED", closed);
    await createSession("PARKED", other);

    const result = await listMerchantValetSessions(adminId, IMAGE_BASE_URL);

    expect(result.items.map(({ id }) => id)).toEqual([arriving, parked]);
    expect(result.completed.map(({ id }) => id)).toEqual([completed]);
  });
});
