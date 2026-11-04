import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { requestMerchantBooth as RequestMerchantBooth } from "./requestMerchantBooth";
import type { BoothMerchantStatus, PrismaClient } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

let prisma: PrismaClient;
let requestMerchantBooth: typeof RequestMerchantBooth;
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const fixtureIds = { staff: [] as number[], booth: [] as number[], merchant: [] as number[] };

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for booth request integration tests");

  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to mutate database without a test name: ${databaseName}`);
  }
  return value;
};

const createBooth = async (label: string) => {
  const creator = await prisma.staff.create({ data: { role: "VALET_AGENT" }, select: { id: true } });
  fixtureIds.staff.push(creator.id);
  const booth = await prisma.booth.create({
    data: { creatorId: creator.id, name: `integration-booth-request-${label}-${suffix}`, address: "서울시" },
    select: { id: true },
  });
  fixtureIds.booth.push(booth.id);
  return booth.id;
};

const createMerchantWithContract = async (boothId: number, status: BoothMerchantStatus) => {
  const admin = await prisma.staff.create({ data: { role: "MERCHANT_ADMIN" }, select: { id: true } });
  fixtureIds.staff.push(admin.id);
  const merchant = await prisma.merchant.create({
    data: {
      adminId: admin.id,
      name: `integration-booth-request-${suffix}`,
      address: "서울시",
      booths: { create: { boothId, status } },
    },
    select: { id: true },
  });
  fixtureIds.merchant.push(merchant.id);
  return { adminId: admin.id, merchantId: merchant.id };
};

const readStatuses = (merchantId: number) =>
  prisma.boothMerchant
    .findMany({ where: { merchantId }, select: { boothId: true, status: true }, orderBy: { boothId: "asc" } })
    .then((rows) => Object.fromEntries(rows.map(({ boothId, status }) => [boothId, status])));

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ requestMerchantBooth } = await import("./requestMerchantBooth"));
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.merchant.deleteMany({ where: { id: { in: fixtureIds.merchant } } });
  await prisma.booth.deleteMany({ where: { id: { in: fixtureIds.booth } } });
  await prisma.staff.deleteMany({ where: { id: { in: fixtureIds.staff } } });
  await prisma.$disconnect();
});

describe("requestMerchantBooth database integration", () => {
  it("lets a waiting merchant ask another booth and ask a rejecting booth again", async () => {
    const rejectedBoothId = await createBooth("rejected");
    const otherBoothId = await createBooth("other");
    const { adminId, merchantId } = await createMerchantWithContract(rejectedBoothId, "REJECTED");

    await expect(requestMerchantBooth(adminId, merchantId, otherBoothId)).resolves.toEqual({ ok: true });
    await expect(requestMerchantBooth(adminId, merchantId, rejectedBoothId)).resolves.toEqual({
      ok: true,
    });
    await expect(requestMerchantBooth(adminId, merchantId, otherBoothId)).resolves.toEqual({
      ok: false,
      reason: "ALREADY_REQUESTED",
    });

    await expect(readStatuses(merchantId)).resolves.toEqual({
      [rejectedBoothId]: "PENDING",
      [otherBoothId]: "PENDING",
    });
  });

  it("refuses once the merchant is approved", async () => {
    const approvedBoothId = await createBooth("approved");
    const otherBoothId = await createBooth("approved-other");
    const { adminId, merchantId } = await createMerchantWithContract(approvedBoothId, "APPROVED");

    await expect(requestMerchantBooth(adminId, merchantId, otherBoothId)).resolves.toEqual({
      ok: false,
      reason: "MERCHANT_ALREADY_APPROVED",
    });
    await expect(readStatuses(merchantId)).resolves.toEqual({ [approvedBoothId]: "APPROVED" });
  });
});
