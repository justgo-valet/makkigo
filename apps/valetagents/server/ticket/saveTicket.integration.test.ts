import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PrismaClient } from "database";
import type { TicketDesign } from "@makkigo/ticket-design";
import type { saveTicket as SaveTicket } from "./saveTicket";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

let prisma: PrismaClient;
let saveTicket: typeof SaveTicket;
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

const design = (backgroundColor: string): TicketDesign => ({
  version: 1,
  shape: "RECTANGLE" as const,
  backgroundColor,
  layers: [],
});

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ saveTicket } = await import("./saveTicket"));
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.merchant.deleteMany({ where: { adminId: { in: fixtureIds.staff } } });
  await prisma.staff.deleteMany({ where: { id: { in: fixtureIds.staff } } });
  await prisma.$disconnect();
});

describe("save ticket database integration", () => {
  it("creates a ticket and appends a version without modifying prior versions or crossing owners", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const [owner, other] = await Promise.all(
      ["owner", "other"].map((name) => prisma.staff.create({
        data: { role: "MERCHANT_ADMIN", name: `save-ticket-${name}-${suffix}` },
        select: { id: true },
      })),
    );
    fixtureIds.staff.push(owner.id, other.id);
    const merchant = await prisma.merchant.create({
      data: { adminId: owner.id, name: `save-ticket-${suffix}`, address: "서울시 테스트구" },
      select: { id: true },
    });
    const created = await saveTicket({ staffId: owner.id, merchantId: merchant.id, design: design("#111111") });
    expect(created.kind).toBe("SAVED");
    if (created.kind !== "SAVED") return;

    const firstVersion = await prisma.ticketVersion.findFirstOrThrow({ where: { ticketId: created.ticketId } });
    await expect(saveTicket({ staffId: owner.id, ticketId: created.ticketId, design: design("#222222") }))
      .resolves.toMatchObject({ kind: "SAVED", ticketId: created.ticketId });
    const versions = await prisma.ticketVersion.findMany({ where: { ticketId: created.ticketId }, orderBy: { id: "asc" } });
    expect(versions).toHaveLength(2);
    expect(versions[0]).toMatchObject({ id: firstVersion.id, design: design("#111111") });
    expect(versions[1].design).toEqual(design("#222222"));
    await expect(saveTicket({ staffId: other.id, ticketId: created.ticketId, design: design("#333333") }))
      .resolves.toEqual({ kind: "NOT_FOUND" });
  });
});
