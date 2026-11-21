import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { getTickets as GetTickets } from "./getTickets";
import type { PrismaClient } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

let prisma: PrismaClient;
let getTickets: typeof GetTickets;
const fixtureIds = { users: [] as number[], merchants: [] as number[], sessions: [] as number[] };

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
  ({ getTickets } = await import("./getTickets"));
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.valetSession.deleteMany({ where: { id: { in: fixtureIds.sessions } } });
  await prisma.user.deleteMany({ where: { id: { in: fixtureIds.users } } });
  await prisma.merchant.deleteMany({ where: { id: { in: fixtureIds.merchants } } });
  await prisma.$disconnect();
});

describe.skipIf(!process.env.TEST_DATABASE_URL)("customer ticket history integration", () => {
  it("renders the authenticated session's pinned version instead of the merchant's newest version", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [user, unrelatedUser, pinnedUser] = await Promise.all([
      prisma.user.create({ data: {} }),
      prisma.user.create({ data: {} }),
      prisma.user.create({ data: {} }),
    ]);
    fixtureIds.users.push(user.id, unrelatedUser.id, pinnedUser.id);
    const merchant = await prisma.merchant.create({
      data: { name: `customer-ticket-${suffix}`, address: "서울시 테스트구" },
      select: { id: true, name: true },
    });
    fixtureIds.merchants.push(merchant.id);
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

    const parkedAt = new Date("2026-11-20T01:00:00.000Z");
    const completedSessions = await Promise.all(
      [
        { completedAt: new Date("2026-11-18T03:00:00.000Z"), versionIndex: 1 },
        { completedAt: new Date("2026-11-19T03:00:00.000Z"), versionIndex: 0 },
      ].map(({ completedAt, versionIndex }, index) =>
        prisma.valetSession.create({
          data: {
            userId: unrelatedUser.id,
            merchantId: merchant.id,
            ticketVersionId: ticket.versions[versionIndex].id,
            ticketNumber: index + 1,
            plateNumber: `90마${suffix.slice(-4)}`,
            status: "COMPLETED",
            parkedAt,
            completedAt,
          },
          select: { id: true },
        }),
      ),
    );
    const ticketlessCompleted = await prisma.valetSession.create({
      data: {
        userId: unrelatedUser.id,
        plateNumber: `91바${suffix.slice(-4)}`,
        status: "COMPLETED",
        completedAt: new Date("2026-11-20T03:00:00.000Z"),
      },
      select: { id: true },
    });
    fixtureIds.sessions.push(...completedSessions.map(({ id }) => id), ticketlessCompleted.id);

    await expect(getTickets(user.id)).resolves.toEqual({ current: null, past: [] });
    await expect(getTickets(pinnedUser.id)).resolves.toEqual({
      current: {
        sessionId: pinnedUserSession.id,
        design: design("#111111"),
        ticketNumber: null,
        merchantName: null,
        issuedAt: null,
      },
      past: [],
    });
    await expect(getTickets(unrelatedUser.id)).resolves.toEqual({
      current: null,
      past: [
        {
          sessionId: completedSessions[1].id,
          design: design("#111111"),
          ticketNumber: 2,
          merchantName: merchant.name,
          issuedAt: parkedAt.toISOString(),
        },
        {
          sessionId: completedSessions[0].id,
          design: design("#222222"),
          ticketNumber: 1,
          merchantName: merchant.name,
          issuedAt: parkedAt.toISOString(),
        },
      ],
    });
  });
});
