import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PrismaClient } from "database";
import type { listOwnTickets as ListOwnTickets } from "./listOwnTickets";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

let prisma: PrismaClient;
let listOwnTickets: typeof ListOwnTickets;
const fixtureIds = { staff: [] as number[] };

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
  version: 1,
  shape: "ROUNDED",
  backgroundColor,
  layers: [],
});

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ listOwnTickets } = await import("./listOwnTickets"));
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.merchant.deleteMany({ where: { adminId: { in: fixtureIds.staff } } });
  await prisma.staff.deleteMany({ where: { id: { in: fixtureIds.staff } } });
  await prisma.$disconnect();
});

describe("own ticket list database integration", () => {
  it("returns only active owned tickets with their strict latest versions in stable latest order", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [owner, other] = await Promise.all(
      ["owner", "other"].map((name) =>
        prisma.staff.create({
          data: { role: "MERCHANT_ADMIN", name: `ticket-${name}-${suffix}` },
          select: { id: true },
        }),
      ),
    );
    fixtureIds.staff.push(owner.id, other.id);

    const [ownedMerchant, deletedMerchant, otherMerchant] = await Promise.all([
      prisma.merchant.create({
        data: { adminId: owner.id, name: `owned-${suffix}`, address: "서울시 테스트구" },
        select: { id: true },
      }),
      prisma.merchant.create({
        data: {
          adminId: owner.id,
          name: `deleted-${suffix}`,
          address: "서울시 테스트구",
          deletedAt: new Date(),
        },
        select: { id: true },
      }),
      prisma.merchant.create({
        data: { adminId: other.id, name: `other-${suffix}`, address: "서울시 테스트구" },
        select: { id: true },
      }),
    ]);

    const versionTime = new Date("2026-10-14T01:00:00.000Z");
    const newestTime = new Date("2026-10-14T02:00:00.000Z");
    const first = await prisma.ticket.create({
      data: {
        merchantId: ownedMerchant.id,
        versions: {
          create: [
            { design: design("#111111"), createdAt: versionTime },
            { design: design("#222222"), createdAt: newestTime },
            { design: design("#AAAAAA"), createdAt: newestTime },
          ],
        },
      },
      select: { id: true },
    });
    const second = await prisma.ticket.create({
      data: {
        merchantId: ownedMerchant.id,
        versions: { create: { design: design("#333333"), createdAt: newestTime } },
      },
      select: { id: true },
    });
    await Promise.all([
      prisma.ticket.create({
        data: {
          merchantId: ownedMerchant.id,
          deletedAt: new Date(),
          versions: { create: { design: design("#444444") } },
        },
      }),
      prisma.ticket.create({
        data: {
          merchantId: deletedMerchant.id,
          versions: { create: { design: design("#555555") } },
        },
      }),
      prisma.ticket.create({
        data: {
          merchantId: otherMerchant.id,
          versions: { create: { design: design("#666666") } },
        },
      }),
    ]);
    await prisma.ticket.create({
      data: {
        merchantId: ownedMerchant.id,
        versions: { create: { design: { version: 0, html: "<b>legacy</b>" } } },
      },
    });

    await expect(listOwnTickets(owner.id)).resolves.toEqual({
      items: [
        { id: second.id, design: design("#333333") },
        { id: first.id, design: design("#AAAAAA") },
      ],
    });
  });
});
