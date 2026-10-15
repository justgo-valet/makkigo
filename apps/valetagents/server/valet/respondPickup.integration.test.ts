import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { respondPickup as RespondPickup } from "./respondPickup";
import type { PrismaClient } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

let prisma: PrismaClient;
let respondPickup: typeof RespondPickup;
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
  ({ respondPickup } = await import("./respondPickup"));

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  staffId = (
    await prisma.staff.create({
      data: { role: "VALET_AGENT", name: `integration-respond-${suffix}` },
      select: { id: true },
    })
  ).id;
  boothId = (
    await prisma.booth.create({
      data: {
        creatorId: staffId,
        name: `integration-respond-${suffix}`,
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

describe("respondPickup database integration", () => {
  it("answers a pickup request once with the agent's fee and pickup time", async () => {
    const now = new Date("2026-10-14T03:00:00.000Z");
    const session = await prisma.valetSession.create({
      data: {
        status: "PICKUP_REQUESTED",
        plateNumber: "12가3456",
        boothId,
        parkedAt: new Date("2026-10-14T01:50:00.000Z"),
        pickupRequestedAt: new Date("2026-10-14T02:58:00.000Z"),
        baseFee: 17000,
      },
      select: { id: true },
    });
    const body = { actualFee: 15000, expectedPickupMinutes: 5 };

    await expect(respondPickup(staffId, boothId, session.id, body, now)).resolves.toEqual({
      ok: true,
      notice: null,
    });
    await expect(respondPickup(staffId, boothId, session.id, body, now)).resolves.toEqual({
      ok: false,
      reason: "NOT_RESPONDABLE",
    });

    expect(await prisma.valetSession.findUniqueOrThrow({ where: { id: session.id } })).toMatchObject({
      status: "PICKUP_PREPARING",
      actualFee: 15000,
      pickupRespondedById: staffId,
      pickupRespondedAt: now,
      expectedPickupAt: new Date("2026-10-14T03:05:00.000Z"),
    });
  });
});
