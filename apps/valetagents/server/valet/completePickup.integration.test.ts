import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { completePickup as CompletePickup } from "./completePickup";
import type { PrismaClient } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

let prisma: PrismaClient;
let completePickup: typeof CompletePickup;
let staffId: number;
let boothId: number;

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
  ({ completePickup } = await import("./completePickup"));

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  staffId = (
    await prisma.staff.create({
      data: { role: "VALET_AGENT", name: `integration-complete-${suffix}` },
      select: { id: true },
    })
  ).id;
  boothId = (
    await prisma.booth.create({
      data: {
        creatorId: staffId,
        name: `integration-complete-${suffix}`,
        address: "서울시 테스트구",
        agents: { create: { staffId, status: "APPROVED" } },
      },
      select: { id: true },
    })
  ).id;
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.valetSession.deleteMany({ where: { boothId } });
  await prisma.booth.deleteMany({ where: { id: boothId } });
  await prisma.staff.deleteMany({ where: { id: staffId } });
  await prisma.$disconnect();
});

describe("completePickup database integration", () => {
  it("completes a car being prepared for pickup once", async () => {
    const now = new Date("2026-10-14T03:10:00.000Z");
    const session = await prisma.valetSession.create({
      data: {
        status: "PICKUP_PREPARING",
        plateNumber: "12가3456",
        boothId,
        parkedAt: new Date("2026-10-14T01:50:00.000Z"),
        pickupRequestedAt: new Date("2026-10-14T02:58:00.000Z"),
        actualFee: 15000,
        expectedPickupAt: new Date("2026-10-14T03:05:00.000Z"),
      },
      select: { id: true },
    });

    await expect(completePickup(staffId, boothId, session.id, now)).resolves.toEqual({
      ok: true,
      notice: null,
    });
    await expect(completePickup(staffId, boothId, session.id, now)).resolves.toEqual({
      ok: false,
      reason: "NOT_COMPLETABLE",
    });

    expect(await prisma.valetSession.findUniqueOrThrow({ where: { id: session.id } })).toMatchObject({
      status: "COMPLETED",
      completedAt: now,
      completedById: staffId,
    });
  });
});
