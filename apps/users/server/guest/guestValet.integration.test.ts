import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type * as GuestValet from "./guestValet";
import type { PrismaClient } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;
const NOW = new Date("2026-11-11T05:00:00.000Z");

let prisma: PrismaClient;
let guest: typeof GuestValet;
let suffix: string;
let staffId: number;
let boothId: number;
let otherBoothId: number;
let merchantId: number;
let otherMerchantId: number;
const sessionIds: number[] = [];

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for guest valet integration tests");
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

const plate = (prefix: string) => `${prefix}${suffix.slice(-4)}`;

const park = async (plateNumber: string, data: { boothId?: number; merchantId?: number } = {}) => {
  const session = await prisma.valetSession.create({
    data: {
      plateNumber,
      status: "PARKED",
      parkedAt: new Date("2026-11-11T03:00:00.000Z"),
      ...data,
    },
    select: { id: true },
  });
  sessionIds.push(session.id);
  return session.id;
};

beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) return;
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  guest = await import("./guestValet");

  suffix = `${Date.now()}`.padStart(4, "0");
  staffId = (
    await prisma.staff.create({
      data: { role: "VALET_AGENT", name: `guest-${suffix}` },
      select: { id: true },
    })
  ).id;
  const createBooth = async (label: string) =>
    (
      await prisma.booth.create({
        data: {
          creatorId: staffId,
          name: `guest-${label}-${suffix}`,
          address: "서울시 테스트구",
          agents: { create: { staffId, status: "APPROVED" } },
          feePolicies: {
            create: {
              baseMinutes: 60,
              baseFee: 10_000,
              extraUnitMinutes: 30,
              extraUnitFee: 2_000,
              effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
            },
          },
        },
        select: { id: true },
      })
    ).id;
  boothId = await createBooth("booth");
  otherBoothId = await createBooth("other");
  const createMerchant = async (label: string, contractBoothId: number) =>
    (
      await prisma.merchant.create({
        data: {
          adminId: staffId,
          name: `guest-${label}-${suffix}`,
          address: "서울시 테스트구",
          booths: { create: { boothId: contractBoothId, status: "APPROVED" } },
          tickets: {
            create: {
              versions: {
                create: [{ design: design(`#${label === "merchant" ? "111111" : "222222"}`) }],
              },
            },
          },
        },
        select: { id: true },
      })
    ).id;
  merchantId = await createMerchant("merchant", boothId);
  otherMerchantId = await createMerchant("other", otherBoothId);
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.valetSession.deleteMany({ where: { id: { in: sessionIds } } });
  await prisma.merchant.deleteMany({ where: { id: { in: [merchantId, otherMerchantId] } } });
  await prisma.booth.deleteMany({ where: { id: { in: [boothId, otherBoothId] } } });
  await prisma.staff.deleteMany({ where: { id: staffId } });
  await prisma.$disconnect();
});

describe.skipIf(!process.env.TEST_DATABASE_URL)("guest valet integration", () => {
  it("shows a merchant only while it has an approved booth contract, with its newest ticket", async () => {
    await expect(guest.getGuestMerchant(merchantId)).resolves.toMatchObject({
      merchant: { id: merchantId },
      ticket: design("#111111"),
    });
    await prisma.boothMerchant.updateMany({
      where: { merchantId: otherMerchantId },
      data: { status: "PENDING" },
    });
    await expect(guest.getGuestMerchant(otherMerchantId)).resolves.toBeNull();
    await prisma.boothMerchant.updateMany({
      where: { merchantId: otherMerchantId },
      data: { status: "APPROVED" },
    });
  });

  it("finds a car only at the merchant's contracted booths or already linked to the merchant", async () => {
    await park(plate("11가"), { boothId });
    await park(plate("22가"), { boothId: otherBoothId });
    await park(plate("33가"), { boothId: otherBoothId, merchantId });

    await expect(guest.getGuestSession(merchantId, plate("11가"), NOW)).resolves.toMatchObject({
      session: { plateNumber: plate("11가"), status: "PARKED" },
      ticket: design("#111111"),
    });
    await expect(guest.getGuestSession(merchantId, plate("22가"), NOW)).resolves.toBeNull();
    await expect(guest.getGuestSession(merchantId, plate("33가"), NOW)).resolves.not.toBeNull();
    await expect(guest.getGuestSession(merchantId, plate("99가"), NOW)).resolves.toBeNull();
  });

  it("requests pickup, links the merchant and its ticket only when empty, and records consent", async () => {
    const unlinked = await park(plate("44가"), { boothId });
    const linked = await park(plate("55가"), { boothId, merchantId: otherMerchantId });
    await prisma.boothMerchant.create({
      data: { boothId, merchantId: otherMerchantId, status: "APPROVED" },
    });
    await expect(guest.getGuestSession(merchantId, plate("55가"), NOW)).resolves.toMatchObject({
      ticket: null,
    });
    const request = (plateNumber: string) =>
      guest.requestGuestPickup(
        merchantId,
        { plateNumber, agreed: true, documentVersion: "2026-10-31" },
        NOW,
      );

    await expect(request(plate("44가"))).resolves.toMatchObject({
      ok: true,
      valetSessionId: unlinked,
    });
    await expect(request(plate("44가"))).resolves.toEqual({
      ok: false,
      reason: "ALREADY_REQUESTED",
    });
    await expect(request(plate("55가"))).resolves.toMatchObject({
      ok: true,
      valetSessionId: linked,
    });

    const sessions = await prisma.valetSession.findMany({
      where: { id: { in: [unlinked, linked] } },
      orderBy: { id: "asc" },
      select: {
        status: true,
        baseFee: true,
        merchantId: true,
        ticketVersionId: true,
        guestConsents: { select: { type: true, documentVersion: true }, orderBy: { type: "asc" } },
      },
    });
    expect(sessions[0]).toMatchObject({
      status: "PICKUP_REQUESTED",
      baseFee: 14_000,
      merchantId,
      guestConsents: [
        { type: "TERMS_OF_SERVICE", documentVersion: "2026-10-31" },
        { type: "PRIVACY_THIRD_PARTY", documentVersion: "2026-10-31" },
      ],
    });
    expect(sessions[0].ticketVersionId).not.toBeNull();
    expect(sessions[1]).toMatchObject({ status: "PICKUP_REQUESTED", merchantId: otherMerchantId });
  });
});
