import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { listCompletedValetSessions as ListCompletedValetSessions } from "./listCompletedValetSessions";
import type { BoothMerchantStatus, PrismaClient, ValetSessionStatus } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

let prisma: PrismaClient;
let listCompletedValetSessions: typeof ListCompletedValetSessions;
let suffix: string;
let managerId: number;
let boothId: number;
let otherBoothId: number;
const staffIds: number[] = [];
const boothIds: number[] = [];
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

const createStaff = async (label: string) => {
  const staff = await prisma.staff.create({
    data: { role: "VALET_AGENT", name: `integration-${label}-${suffix}` },
    select: { id: true },
  });
  staffIds.push(staff.id);
  return staff.id;
};

const createBooth = async (label: string) => {
  const booth = await prisma.booth.create({
    data: { creatorId: managerId, name: `integration-${label}-${suffix}`, address: "서울시 테스트구" },
    select: { id: true },
  });
  boothIds.push(booth.id);
  return booth.id;
};

const createMerchant = async (contractBoothId: number, status: BoothMerchantStatus) => {
  const merchant = await prisma.merchant.create({
    data: {
      adminId: managerId,
      name: `integration-merchant-${suffix}`,
      address: "서울시 테스트구",
      booths: { create: { boothId: contractBoothId, status } },
    },
    select: { id: true },
  });
  merchantIds.push(merchant.id);
  return merchant.id;
};

const createSession = async (
  status: ValetSessionStatus,
  data: {
    merchantId?: number;
    boothId?: number;
    completedAt?: Date;
    baseFee?: number;
    actualFee?: number;
  },
) => {
  const session = await prisma.valetSession.create({
    data: { status, plateNumber: "12가3456", ...data },
    select: { id: true },
  });
  sessionIds.push(session.id);
  return session.id;
};

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ listCompletedValetSessions } = await import("./listCompletedValetSessions"));

  suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  managerId = await createStaff("manager");
  boothId = await createBooth("booth");
  otherBoothId = await createBooth("other-booth");
  await prisma.boothAgent.create({ data: { boothId, staffId: managerId, status: "APPROVED" } });
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.valetSession.deleteMany({ where: { id: { in: sessionIds } } });
  await prisma.merchant.deleteMany({ where: { id: { in: merchantIds } } });
  await prisma.booth.deleteMany({ where: { id: { in: boothIds } } });
  await prisma.staff.deleteMany({ where: { id: { in: staffIds } } });
  await prisma.$disconnect();
});

describe("listCompletedValetSessions database integration", () => {
  const NOW = new Date("2026-11-07T03:00:00.000Z");

  it("lets only approved agents of the booth read the history", async () => {
    const requestedId = await createStaff("requested");
    await prisma.boothAgent.create({ data: { boothId, staffId: requestedId, status: "REQUESTED" } });

    await expect(listCompletedValetSessions(requestedId, boothId, "2026-11-06", NOW)).resolves.toEqual({
      ok: false,
      reason: "BOOTH_AGENT_REQUIRED",
    });
  });

  it("lists cars completed at the booth during the Seoul day with their fee", async () => {
    const merchantId = await createMerchant(boothId, "APPROVED");
    const first = await createSession("COMPLETED", {
      merchantId,
      boothId,
      completedAt: new Date("2026-11-05T15:00:00.000Z"),
      baseFee: 12_000,
    });
    const last = await createSession("COMPLETED", {
      boothId,
      completedAt: new Date("2026-11-06T14:59:59.999Z"),
      baseFee: 12_000,
      actualFee: 15_000,
    });
    await createSession("COMPLETED", { boothId, completedAt: new Date("2026-11-05T14:59:59.999Z") });
    await createSession("COMPLETED", { boothId, completedAt: new Date("2026-11-06T15:00:00.000Z") });
    await createSession("COMPLETED", {
      boothId: otherBoothId,
      completedAt: new Date("2026-11-06T03:00:00.000Z"),
    });
    await createSession("CANCELLED", { boothId, completedAt: new Date("2026-11-06T03:00:00.000Z") });

    const result = await listCompletedValetSessions(managerId, boothId, "2026-11-06", NOW);

    expect(result.ok && result.value.items.map(({ id, merchant, fee }) => ({ id, merchant: merchant?.id ?? null, fee }))).toEqual([
      { id: last, merchant: null, fee: 15_000 },
      { id: first, merchant: merchantId, fee: 12_000 },
    ]);
    expect(result.ok && result.value.merchants.map(({ id }) => id)).toContain(merchantId);
    expect(result.ok && result.value.today).toBe("2026-11-07");
  });
});
