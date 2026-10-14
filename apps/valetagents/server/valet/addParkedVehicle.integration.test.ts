import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { addParkedVehicle as AddParkedVehicle } from "./addParkedVehicle";
import type { PrismaClient } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

let prisma: PrismaClient;
let addParkedVehicle: typeof AddParkedVehicle;
let staffId: number;
let boothId: number;
let merchantId: number;
let userId: number;
let plateNumber: string;

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for valet session integration tests");

  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to mutate database without a test name: ${databaseName}`);
  }
  return value;
};

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ addParkedVehicle } = await import("./addParkedVehicle"));

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  plateNumber = `${String(Date.now()).slice(-2)}가${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
  staffId = (
    await prisma.staff.create({
      data: { role: "VALET_AGENT", name: `integration-add-${suffix}` },
      select: { id: true },
    })
  ).id;
  boothId = (
    await prisma.booth.create({
      data: {
        creatorId: staffId,
        name: `integration-add-${suffix}`,
        address: "서울시 테스트구",
        agents: { create: { staffId, status: "APPROVED" } },
      },
      select: { id: true },
    })
  ).id;
  merchantId = (
    await prisma.merchant.create({
      data: {
        adminId: staffId,
        name: `integration-add-${suffix}`,
        address: "서울시 테스트구",
        booths: { create: { boothId, status: "APPROVED" } },
      },
      select: { id: true },
    })
  ).id;
  userId = (
    await prisma.user.create({
      data: { vehicle: { create: { plateNumber } } },
      select: { id: true },
    })
  ).id;
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.valetSession.deleteMany({ where: { boothId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.merchant.deleteMany({ where: { id: merchantId } });
  await prisma.booth.deleteMany({ where: { id: boothId } });
  await prisma.staff.deleteMany({ where: { id: staffId } });
  await prisma.$disconnect();
});

describe("addParkedVehicle database integration", () => {
  it("adds a parked car once per plate, linked to its member and the booth's only merchant", async () => {
    const added = await addParkedVehicle(staffId, boothId, plateNumber);

    await expect(addParkedVehicle(staffId, boothId, plateNumber)).resolves.toEqual({
      ok: false,
      reason: "ACTIVE_SESSION_EXISTS",
    });

    const session = await prisma.valetSession.findFirstOrThrow({ where: { boothId } });
    expect(added).toMatchObject({ ok: true, valetSessionId: session.id, notice: { userId } });
    expect(session).toMatchObject({ status: "PARKED", plateNumber, userId, merchantId, parkedById: staffId });
  });
});
