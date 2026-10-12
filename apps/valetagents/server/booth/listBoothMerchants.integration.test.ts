import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { listBoothMerchants as ListBoothMerchants } from "./listBoothMerchants";
import type { BoothMerchantStatus, PrismaClient } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

let prisma: PrismaClient;
let listBoothMerchants: typeof ListBoothMerchants;
let suffix: string;
let managerId: number;
let otherManagerId: number;
let merchantAdminId: number;
let boothId: number;
let otherBoothId: number;
const fixtureIds = { booth: [] as number[], staff: [] as number[], merchant: [] as number[] };

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for booth merchant integration tests");

  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to mutate database without a test name: ${databaseName}`);
  }
  return value;
};

const createMerchant = async (
  label: string,
  overrides: { addressDetail?: string; deletedAt?: Date } = {},
) => {
  const merchant = await prisma.merchant.create({
    data: {
      adminId: merchantAdminId,
      name: `integration-${label}-${suffix}`,
      address: `서울시 테스트구 ${label}로`,
      ...overrides,
    },
    select: { id: true },
  });
  fixtureIds.merchant.push(merchant.id);
  return merchant.id;
};

const createContract = async (
  merchantId: number,
  status: BoothMerchantStatus,
  overrides: { boothId?: number; createdAt?: Date } = {},
) => prisma.boothMerchant.create({ data: { boothId, merchantId, status, ...overrides } });

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ listBoothMerchants } = await import("./listBoothMerchants"));

  suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const createStaff = async (label: string, role: "VALET_AGENT" | "MERCHANT_ADMIN") =>
    (
      await prisma.staff.create({
        data: { role, name: `integration-${label}-${suffix}` },
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

  managerId = await createStaff("manager", "VALET_AGENT");
  otherManagerId = await createStaff("other-manager", "VALET_AGENT");
  merchantAdminId = await createStaff("merchant-admin", "MERCHANT_ADMIN");
  boothId = await createBooth("booth", managerId);
  otherBoothId = await createBooth("other-booth", otherManagerId);
  fixtureIds.staff.push(managerId, otherManagerId, merchantAdminId);
  fixtureIds.booth.push(boothId, otherBoothId);
});

beforeEach(async () => {
  await prisma.merchant.deleteMany({ where: { id: { in: fixtureIds.merchant } } });
  fixtureIds.merchant.length = 0;
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.merchant.deleteMany({ where: { id: { in: fixtureIds.merchant } } });
  await prisma.booth.deleteMany({ where: { id: { in: fixtureIds.booth } } });
  await prisma.staff.deleteMany({ where: { id: { in: fixtureIds.staff } } });
  await prisma.$disconnect();
});

describe("listBoothMerchants database integration", () => {
  it("lists only the merchants contracted with the booth, with each stored status and updatedAt", async () => {
    const pending = await createMerchant("pending", { addressDetail: "2층" });
    const approved = await createMerchant("approved");
    const rejected = await createMerchant("rejected");
    const elsewhere = await createMerchant("elsewhere");
    await createMerchant("no-contract");
    await createContract(pending, "PENDING", { createdAt: new Date("2026-10-01T00:00:00.000Z") });
    await createContract(approved, "APPROVED");
    await createContract(rejected, "REJECTED");
    await createContract(elsewhere, "APPROVED", { boothId: otherBoothId });
    await prisma.boothMerchant.update({
      where: { boothId_merchantId: { boothId, merchantId: pending } },
      data: { status: "APPROVED" },
    });

    const result = await listBoothMerchants(managerId, boothId, 1);
    const stored = await prisma.boothMerchant.findMany({
      where: { boothId },
      select: { merchantId: true, status: true, updatedAt: true },
    });

    expect(result.ok && result.value.items.map(({ id }) => id).sort()).toEqual(
      [pending, approved, rejected].sort(),
    );
    expect(
      result.ok &&
        result.value.items
          .map(({ id, status, updatedAt }) => ({ id, status, updatedAt }))
          .sort((left, right) => left.id - right.id),
    ).toEqual(
      stored
        .map((row) => ({ id: row.merchantId, status: row.status, updatedAt: row.updatedAt.toISOString() }))
        .sort((left, right) => left.id - right.id),
    );
    expect(stored.map(({ status }) => status).sort()).toEqual(["APPROVED", "APPROVED", "REJECTED"]);
  });

  it("pages five merchants at a time in request order and leaves out deleted merchants", async () => {
    const merchants: number[] = [];
    for (let index = 0; index < 7; index += 1) merchants.push(await createMerchant(`page-${index}`));
    await createContract(await createMerchant("deleted", { deletedAt: new Date() }), "APPROVED");
    for (const [index, merchantId] of [...merchants].reverse().entries()) {
      await createContract(merchantId, "PENDING", {
        createdAt: new Date(`2026-10-01T00:00:0${index}.000Z`),
      });
    }
    const requested = [...merchants].reverse();

    const first = await listBoothMerchants(managerId, boothId, 1);
    const second = await listBoothMerchants(managerId, boothId, 2);

    expect(first.ok && first.value.items.map(({ id }) => id)).toEqual(requested.slice(0, 5));
    expect(second.ok && second.value.items.map(({ id }) => id)).toEqual(requested.slice(5));
    expect(second.ok && second.value.totalPages).toBe(2);
  });

  it("only lets the booth creator list", async () => {
    await createContract(await createMerchant("contracted"), "APPROVED");

    await expect(listBoothMerchants(otherManagerId, boothId, 1)).resolves.toEqual({
      ok: false,
      reason: "BOOTH_MANAGER_REQUIRED",
    });
  });
});
