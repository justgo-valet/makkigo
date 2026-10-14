import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { parkValetSession as ParkValetSession } from "./parkValetSession";
import type { PrismaClient } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

let prisma: PrismaClient;
let parkValetSession: typeof ParkValetSession;
let staffId: number;
let boothId: number;
let merchantId: number;
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

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ parkValetSession } = await import("./parkValetSession"));

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  staffId = (
    await prisma.staff.create({
      data: { role: "VALET_AGENT", name: `integration-park-${suffix}` },
      select: { id: true },
    })
  ).id;
  boothId = (
    await prisma.booth.create({
      data: {
        creatorId: staffId,
        name: `integration-park-${suffix}`,
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
        name: `integration-park-${suffix}`,
        address: "서울시 테스트구",
        booths: { create: { boothId, status: "APPROVED" } },
        tickets: { create: { versions: { create: [{ design: {} }, { design: {} }] } } },
      },
      select: { id: true },
    })
  ).id;
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.valetSession.deleteMany({ where: { id: { in: sessionIds } } });
  await prisma.merchant.deleteMany({ where: { id: merchantId } });
  await prisma.booth.deleteMany({ where: { id: boothId } });
  await prisma.staff.deleteMany({ where: { id: staffId } });
  await prisma.$disconnect();
});

describe("parkValetSession database integration", () => {
  it("parks an arriving car at the booth once, with the merchant's latest ticket", async () => {
    const session = await prisma.valetSession.create({
      data: { status: "ARRIVING", plateNumber: "12가3456", merchantId },
      select: { id: true },
    });
    sessionIds.push(session.id);
    const latestTicket = await prisma.ticketVersion.findFirstOrThrow({
      where: { ticket: { merchantId } },
      orderBy: { id: "desc" },
      select: { id: true },
    });

    await expect(parkValetSession(staffId, boothId, session.id)).resolves.toEqual({
      ok: true,
      notice: null,
    });
    await expect(parkValetSession(staffId, boothId, session.id)).resolves.toEqual({
      ok: false,
      reason: "NOT_PARKABLE",
    });

    const parked = await prisma.valetSession.findUniqueOrThrow({ where: { id: session.id } });
    expect(parked).toMatchObject({
      status: "PARKED",
      boothId,
      parkedById: staffId,
      ticketVersionId: latestTicket.id,
    });
    expect(parked.parkedAt).not.toBeNull();
  });
});
