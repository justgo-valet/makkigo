import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { getCurrentTicket as GetCurrentTicket } from "./getCurrentTicket";
import type { PrismaClient } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

let prisma: PrismaClient;
let getCurrentTicket: typeof GetCurrentTicket;
const fixtureIds = { users: [] as number[], staff: [] as number[], sessions: [] as number[] };

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for ticket integration tests");
  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to mutate database without a test name: ${databaseName}`);
  }
  return value;
};

const design = (backgroundColor: string) => ({
  version: 1 as const,
  shape: "RECTANGLE" as const,
  backgroundColor,
  layers: [],
});

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ getCurrentTicket } = await import("./getCurrentTicket"));
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.valetSession.deleteMany({ where: { id: { in: fixtureIds.sessions } } });
  await prisma.user.deleteMany({ where: { id: { in: fixtureIds.users } } });
  await prisma.merchant.deleteMany({ where: { adminId: { in: fixtureIds.staff } } });
  await prisma.staff.deleteMany({ where: { id: { in: fixtureIds.staff } } });
  await prisma.$disconnect();
});

describe.skipIf(!process.env.TEST_DATABASE_URL)("current customer ticket integration", () => {
  it("renders the authenticated session's pinned version instead of the merchant's newest version", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [user, unrelatedUser, pinnedUser] = await Promise.all([
      prisma.user.create({ data: {} }),
      prisma.user.create({ data: {} }),
      prisma.user.create({ data: {} }),
    ]);
    fixtureIds.users.push(user.id, unrelatedUser.id, pinnedUser.id);
    const staff = await prisma.staff.create({
      data: { role: "MERCHANT_ADMIN", name: `customer-ticket-${suffix}` },
      select: { id: true },
    });
    fixtureIds.staff.push(staff.id);
    const merchant = await prisma.merchant.create({
      data: { adminId: staff.id, name: `customer-ticket-${suffix}`, address: "서울시 테스트구" },
      select: { id: true },
    });
    const ticket = await prisma.ticket.create({
      data: {
        merchantId: merchant.id,
        versions: { create: [{ design: design("#111111") }, { design: design("#222222") }] },
      },
      select: { versions: { select: { id: true }, orderBy: { id: "asc" } } },
    });
    const pinnedSession = await prisma.valetSession.create({
      data: {
        userId: user.id,
        ticketVersionId: ticket.versions[0].id,
        plateNumber: `12가${suffix.slice(-4)}`,
        status: "PARKED",
      },
      select: { id: true },
    });
    const newerTicketlessSession = await prisma.valetSession.create({
      data: { userId: user.id, plateNumber: `56다${suffix.slice(-4)}`, status: "PARKED" },
      select: { id: true },
    });
    const unrelatedSession = await prisma.valetSession.create({
      data: { userId: unrelatedUser.id, plateNumber: `34나${suffix.slice(-4)}`, status: "PARKED" },
      select: { id: true },
    });
    const pinnedUserSession = await prisma.valetSession.create({
      data: {
        userId: pinnedUser.id,
        ticketVersionId: ticket.versions[0].id,
        plateNumber: `78라${suffix.slice(-4)}`,
        status: "PARKED",
      },
      select: { id: true },
    });
    fixtureIds.sessions.push(
      pinnedSession.id,
      newerTicketlessSession.id,
      unrelatedSession.id,
      pinnedUserSession.id,
    );

    await expect(getCurrentTicket(user.id)).resolves.toBeNull();
    await expect(getCurrentTicket(unrelatedUser.id)).resolves.toBeNull();
    await expect(getCurrentTicket(pinnedUser.id)).resolves.toEqual(design("#111111"));
  });
});
