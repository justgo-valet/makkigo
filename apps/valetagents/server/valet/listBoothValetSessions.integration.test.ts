import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { listBoothValetSessions as ListBoothValetSessions } from "./listBoothValetSessions";
import type { BoothMerchantStatus, PrismaClient, ValetSessionStatus } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;
const IMAGE_BASE_URL = "https://images.example.com";

let prisma: PrismaClient;
let listBoothValetSessions: typeof ListBoothValetSessions;
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
  data: { merchantId?: number; boothId?: number },
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
  ({ listBoothValetSessions } = await import("./listBoothValetSessions"));

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

describe("listBoothValetSessions database integration", () => {
  it("lets only approved agents of the booth read the list", async () => {
    const requestedId = await createStaff("requested");
    await prisma.boothAgent.create({ data: { boothId, staffId: requestedId, status: "REQUESTED" } });

    await expect(listBoothValetSessions(requestedId, boothId, IMAGE_BASE_URL)).resolves.toEqual({
      ok: false,
      reason: "BOOTH_AGENT_REQUIRED",
    });
  });

  it("lists cars arriving for contracted merchants and cars parked at the booth", async () => {
    const contracted = await createMerchant(boothId, "APPROVED");
    const pending = await createMerchant(boothId, "PENDING");
    const elsewhere = await createMerchant(otherBoothId, "APPROVED");

    const arriving = await createSession("ARRIVING", { merchantId: contracted });
    await createSession("ARRIVING", { merchantId: pending });
    await createSession("ARRIVING", { merchantId: elsewhere });
    await createSession("CANCELLED", { merchantId: contracted });
    const parked = await createSession("PARKED", { merchantId: contracted, boothId });
    await createSession("PARKED", { merchantId: contracted, boothId: otherBoothId });
    await createSession("COMPLETED", { merchantId: contracted, boothId });

    const result = await listBoothValetSessions(managerId, boothId, IMAGE_BASE_URL);

    expect(result.ok && result.value.items.map(({ id }) => id)).toEqual([arriving, parked]);
  });
});
