import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { listBoothValetSessions as ListBoothValetSessions } from "./listBoothValetSessions";
import type {
  BoothAgentStatus,
  BoothMerchantStatus,
  PrismaClient,
  ValetSessionStatus,
} from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;
const IMAGE_BASE_URL = "https://images.example.com";

let prisma: PrismaClient;
let listBoothValetSessions: typeof ListBoothValetSessions;
let suffix: string;
let managerId: number;
let boothId: number;
let otherBoothId: number;
let otherBoothAgentId: number;
let userId: number;
let brandId: number;
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

const createBooth = async (label: string, deletedAt: Date | null = null) => {
  const booth = await prisma.booth.create({
    data: {
      creatorId: managerId,
      name: `integration-${label}-${suffix}`,
      address: "서울시 테스트구",
      deletedAt,
    },
    select: { id: true },
  });
  boothIds.push(booth.id);
  return booth.id;
};

const createAgent = async (targetBoothId: number, status: BoothAgentStatus) => {
  const staffId = await createStaff(status.toLowerCase());
  await prisma.boothAgent.create({ data: { boothId: targetBoothId, staffId, status } });
  return staffId;
};

const createMerchant = async (contracts: [number, BoothMerchantStatus][]) => {
  const merchant = await prisma.merchant.create({
    data: {
      adminId: managerId,
      name: `integration-merchant-${suffix}`,
      address: "서울시 테스트구",
      booths: { create: contracts.map(([contractBoothId, status]) => ({ boothId: contractBoothId, status })) },
    },
    select: { id: true },
  });
  merchantIds.push(merchant.id);
  return merchant.id;
};

const createSession = async (
  status: ValetSessionStatus,
  data: { merchantId?: number; boothId?: number; vehicleId?: number } = {},
) => {
  const session = await prisma.valetSession.create({
    data: { status, plateNumber: "12가3456", ...data },
    select: { id: true },
  });
  sessionIds.push(session.id);
  return session.id;
};

const listIds = async (staffId: number, targetBoothId = boothId) => {
  const result = await listBoothValetSessions(staffId, targetBoothId, IMAGE_BASE_URL);
  if (!result.ok) throw new Error(result.reason);
  return result.value.items.map(({ id }) => id).filter((id) => sessionIds.includes(id));
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
  otherBoothAgentId = await createAgent(otherBoothId, "APPROVED");
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.valetSession.deleteMany({ where: { id: { in: sessionIds } } });
  await prisma.merchant.deleteMany({ where: { id: { in: merchantIds } } });
  await prisma.booth.deleteMany({ where: { id: { in: boothIds } } });
  if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  if (brandId) {
    await prisma.carModel.deleteMany({ where: { brandId } });
    await prisma.carBrand.deleteMany({ where: { id: brandId } });
  }
  await prisma.staff.deleteMany({ where: { id: { in: staffIds } } });
  await prisma.$disconnect();
});

describe("listBoothValetSessions database integration", () => {
  it("lets only approved agents of an existing booth read the list", async () => {
    const requestedId = await createAgent(boothId, "REQUESTED");
    const rejectedId = await createAgent(boothId, "REJECTED");
    const deletedBoothId = await createBooth("deleted-booth", new Date());
    await prisma.boothAgent.create({
      data: { boothId: deletedBoothId, staffId: managerId, status: "APPROVED" },
    });

    await expect(listBoothValetSessions(managerId, boothId, IMAGE_BASE_URL)).resolves.toMatchObject({
      ok: true,
    });
    for (const staffId of [requestedId, rejectedId, otherBoothAgentId]) {
      await expect(listBoothValetSessions(staffId, boothId, IMAGE_BASE_URL)).resolves.toEqual({
        ok: false,
        reason: "BOOTH_AGENT_REQUIRED",
      });
    }
    await expect(
      listBoothValetSessions(managerId, deletedBoothId, IMAGE_BASE_URL),
    ).resolves.toEqual({ ok: false, reason: "BOOTH_NOT_FOUND" });
  });

  it("shows arriving cars only for merchants with an approved contract with the booth", async () => {
    const approved = await createMerchant([
      [boothId, "APPROVED"],
      [otherBoothId, "APPROVED"],
    ]);
    const pending = await createMerchant([[boothId, "PENDING"]]);
    const rejected = await createMerchant([[boothId, "REJECTED"]]);
    const elsewhere = await createMerchant([[otherBoothId, "APPROVED"]]);

    const visible = await createSession("ARRIVING", { merchantId: approved });
    await createSession("ARRIVING", { merchantId: pending });
    await createSession("ARRIVING", { merchantId: rejected });
    await createSession("ARRIVING", { merchantId: elsewhere });
    await createSession("CANCELLED", { merchantId: approved });
    await createSession("PARKED", { merchantId: approved, boothId: otherBoothId });

    expect(await listIds(managerId)).toEqual([visible]);
    expect(await listIds(otherBoothAgentId, otherBoothId)).toContain(visible);
  });

  it("shows parked and pickup cars of this booth and hides finished ones", async () => {
    const before = await listIds(managerId);
    const parked = await createSession("PARKED", { boothId });
    const requested = await createSession("PICKUP_REQUESTED", { boothId });
    const preparing = await createSession("PICKUP_PREPARING", { boothId });
    await createSession("COMPLETED", { boothId });
    await createSession("CANCELLED", { boothId });
    await createSession("PARKED", { boothId: otherBoothId });

    expect(await listIds(managerId)).toEqual([...before, parked, requested, preparing]);
  });

  it("returns the model image, or the default image when the car is unknown", async () => {
    userId = (await prisma.user.create({ data: {}, select: { id: true } })).id;
    brandId = (
      await prisma.carBrand.create({
        data: { name: `integration-brand-${suffix}`, logoUrl: "brands/test.png" },
        select: { id: true },
      })
    ).id;
    const model = await prisma.carModel.create({
      data: { name: "integration-model", imageUrl: "cars/test/model.png", brandId },
      select: { id: true },
    });
    const vehicle = await prisma.vehicle.create({
      data: { userId, plateNumber: `it-${suffix}`, brandId, modelId: model.id },
      select: { id: true },
    });
    const known = await createSession("PARKED", { boothId, vehicleId: vehicle.id });
    const unknown = await createSession("PARKED", { boothId });

    const result = await listBoothValetSessions(managerId, boothId, IMAGE_BASE_URL);
    const images = new Map(
      result.ok ? result.value.items.map(({ id, carImageUrl }) => [id, carImageUrl]) : [],
    );

    expect(images.get(known)).toBe(`${IMAGE_BASE_URL}/cars/test/model.png`);
    expect(images.get(unknown)).toBe(`${IMAGE_BASE_URL}/cars/_default.png`);
  });
});
