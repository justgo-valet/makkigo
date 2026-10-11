import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { listBoothMerchants as ListBoothMerchants } from "./listBoothMerchants";
import type { BoothMerchantStatus, PrismaClient } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;
const MISSING_BOOTH_ID = 2_147_483_647;

let prisma: PrismaClient;
let listBoothMerchants: typeof ListBoothMerchants;
let suffix: string;
let managerId: number;
let otherManagerId: number;
let merchantAdminId: number;
let boothId: number;
let otherBoothId: number;
let deletedBoothId: number;
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

// 업체 픽스처는 이 함수로만 만든다. merchants 에 필수 컬럼이 늘면 여기만 고친다.
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
  const createBooth = async (label: string, creatorId: number, deletedAt?: Date) =>
    (
      await prisma.booth.create({
        data: { creatorId, name: `integration-${label}-${suffix}`, address: "서울시 테스트구", deletedAt },
        select: { id: true },
      })
    ).id;

  managerId = await createStaff("manager", "VALET_AGENT");
  otherManagerId = await createStaff("other-manager", "VALET_AGENT");
  merchantAdminId = await createStaff("merchant-admin", "MERCHANT_ADMIN");
  boothId = await createBooth("booth", managerId);
  otherBoothId = await createBooth("other-booth", otherManagerId);
  deletedBoothId = await createBooth("deleted-booth", managerId, new Date());
  fixtureIds.staff.push(managerId, otherManagerId, merchantAdminId);
  fixtureIds.booth.push(boothId, otherBoothId, deletedBoothId);
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
  it("lists only the merchants that have a contract with the booth", async () => {
    const pending = await createMerchant("pending", { addressDetail: "2층" });
    const approved = await createMerchant("approved");
    const rejected = await createMerchant("rejected");
    const elsewhere = await createMerchant("elsewhere");
    await createMerchant("no-contract");
    await createContract(pending, "PENDING");
    await createContract(approved, "APPROVED");
    await createContract(rejected, "REJECTED");
    await createContract(elsewhere, "APPROVED", { boothId: otherBoothId });

    await expect(listBoothMerchants(managerId, boothId, 1)).resolves.toEqual({
      ok: true,
      value: {
        items: [
          {
            id: pending,
            name: `integration-pending-${suffix}`,
            address: "서울시 테스트구 pending로",
            addressDetail: "2층",
            status: "PENDING",
            updatedAt: expect.any(String),
          },
          {
            id: approved,
            name: `integration-approved-${suffix}`,
            address: "서울시 테스트구 approved로",
            addressDetail: null,
            status: "APPROVED",
            updatedAt: expect.any(String),
          },
          {
            id: rejected,
            name: `integration-rejected-${suffix}`,
            address: "서울시 테스트구 rejected로",
            addressDetail: null,
            status: "REJECTED",
            updatedAt: expect.any(String),
          },
        ],
        page: 1,
        totalPages: 1,
      },
    });
  });

  it("reports each contract's status and updatedAt exactly as stored", async () => {
    const statuses = ["PENDING", "APPROVED", "REJECTED"] as const;
    for (const status of statuses) {
      await createContract(await createMerchant(status.toLowerCase()), status);
    }
    // 수락 시각이 계약 요청 시각과 다른 행: updatedAt 은 createdAt 이 아니라 저장된 updated_at 이어야 한다.
    const reviewed = await createMerchant("reviewed");
    await createContract(reviewed, "PENDING", { createdAt: new Date("2026-10-01T00:00:00.000Z") });
    await prisma.boothMerchant.update({
      where: { boothId_merchantId: { boothId, merchantId: reviewed } },
      data: { status: "APPROVED" },
    });

    const result = await listBoothMerchants(managerId, boothId, 1);
    const stored = await prisma.boothMerchant.findMany({
      where: { boothId },
      orderBy: { merchantId: "asc" },
      select: { merchantId: true, status: true, updatedAt: true },
    });

    expect(stored.map(({ status }) => status)).toEqual(["PENDING", "APPROVED", "REJECTED", "APPROVED"]);
    expect(
      result.ok &&
        result.value.items
          .map(({ id, status, updatedAt }) => ({ id, status, updatedAt }))
          .sort((left, right) => left.id - right.id),
    ).toEqual(
      stored.map((row) => ({
        id: row.merchantId,
        status: row.status,
        updatedAt: row.updatedAt.toISOString(),
      })),
    );
    expect(stored[3].updatedAt.toISOString()).not.toBe("2026-10-01T00:00:00.000Z");
  });

  it("pages five merchants at a time in the order the contracts were requested", async () => {
    const merchants: number[] = [];
    for (let index = 0; index < 7; index += 1) merchants.push(await createMerchant(`page-${index}`));
    // 나중에 만들어진 업체가 계약은 가장 먼저 요청했다.
    const earliest = merchants[6];
    await createContract(earliest, "PENDING", { createdAt: new Date("2026-10-01T00:00:00.000Z") });
    // 같은 시각에 요청한 계약은 업체 id 순이다.
    const sameTime = new Date("2026-10-02T00:00:00.000Z");
    for (const merchantId of [merchants[2], merchants[0], merchants[1]]) {
      await createContract(merchantId, "PENDING", { createdAt: sameTime });
    }
    for (const [offset, merchantId] of [merchants[3], merchants[4], merchants[5]].entries()) {
      await createContract(merchantId, "PENDING", {
        createdAt: new Date(`2026-10-03T00:00:0${offset}.000Z`),
      });
    }

    const first = await listBoothMerchants(managerId, boothId, 1);
    const second = await listBoothMerchants(managerId, boothId, 2);

    expect(first.ok && first.value.items.map(({ id }) => id)).toEqual([
      earliest,
      merchants[0],
      merchants[1],
      merchants[2],
      merchants[3],
    ]);
    expect(first.ok && [first.value.page, first.value.totalPages]).toEqual([1, 2]);
    expect(second.ok && second.value.items.map(({ id }) => id)).toEqual([merchants[4], merchants[5]]);
    expect(second.ok && [second.value.page, second.value.totalPages]).toEqual([2, 2]);
    await expect(listBoothMerchants(managerId, boothId, 3)).resolves.toEqual({
      ok: true,
      value: { items: [], page: 3, totalPages: 2 },
    });
  });

  it("leaves out deleted merchants and does not count them as a page", async () => {
    await createContract(await createMerchant("deleted", { deletedAt: new Date() }), "APPROVED");
    const kept: number[] = [];
    for (let index = 0; index < 5; index += 1) {
      kept.push(await createMerchant(`kept-${index}`));
      await createContract(kept[index], "APPROVED");
    }

    const result = await listBoothMerchants(managerId, boothId, 1);

    expect(result.ok && result.value.items.map(({ id }) => id)).toEqual(kept);
    expect(result.ok && result.value.totalPages).toBe(1);
  });

  it("reports one empty page when no merchant has a contract with the booth", async () => {
    await createContract(await createMerchant("elsewhere"), "PENDING", { boothId: otherBoothId });

    await expect(listBoothMerchants(managerId, boothId, 1)).resolves.toEqual({
      ok: true,
      value: { items: [], page: 1, totalPages: 1 },
    });
  });

  it("only lets the booth creator list, whatever the caller's role or contract", async () => {
    await createContract(await createMerchant("contracted"), "APPROVED");

    await expect(listBoothMerchants(otherManagerId, boothId, 1)).resolves.toEqual({
      ok: false,
      reason: "BOOTH_MANAGER_REQUIRED",
    });
    await expect(listBoothMerchants(merchantAdminId, boothId, 1)).resolves.toEqual({
      ok: false,
      reason: "BOOTH_MANAGER_REQUIRED",
    });
  });

  it("does not find a booth that is missing or deleted", async () => {
    await createContract(await createMerchant("on-deleted-booth"), "APPROVED", { boothId: deletedBoothId });

    await expect(listBoothMerchants(managerId, MISSING_BOOTH_ID, 1)).resolves.toEqual({
      ok: false,
      reason: "BOOTH_NOT_FOUND",
    });
    await expect(listBoothMerchants(managerId, deletedBoothId, 1)).resolves.toEqual({
      ok: false,
      reason: "BOOTH_NOT_FOUND",
    });
  });
});
