import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { savePaymentSettings as SavePaymentSettings } from "./paymentSettings";
import type { PrismaClient } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

let prisma: PrismaClient;
let savePaymentSettings: typeof SavePaymentSettings;
let managerId: number;
let agentId: number;
let boothId: number;

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for payment settings integration tests");

  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to mutate database without a test name: ${databaseName}`);
  }
  return value;
};

const SETTINGS = {
  feePolicy: { baseMinutes: 60, baseFee: 12000, extraUnitMinutes: 30, extraUnitFee: 5000 },
  bankAccount: { bankName: "국민", accountNumber: "123-45-6789", accountHolder: "마끼고" },
};

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ savePaymentSettings } = await import("./paymentSettings"));

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  [managerId, agentId] = await Promise.all(
    ["manager", "agent"].map(
      async (label) =>
        (
          await prisma.staff.create({
            data: { role: "VALET_AGENT", name: `integration-payment-${label}-${suffix}` },
            select: { id: true },
          })
        ).id,
    ),
  );
  boothId = (
    await prisma.booth.create({
      data: {
        creatorId: managerId,
        name: `integration-payment-${suffix}`,
        address: "서울시 테스트구",
        agents: { create: [{ staffId: managerId, status: "APPROVED" }, { staffId: agentId, status: "APPROVED" }] },
      },
      select: { id: true },
    })
  ).id;
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.booth.deleteMany({ where: { id: boothId } });
  await prisma.staff.deleteMany({ where: { id: { in: [managerId, agentId] } } });
  await prisma.$disconnect();
});

describe("savePaymentSettings database integration", () => {
  it("lets only the booth manager add new fee and account rows when the values change", async () => {
    await expect(savePaymentSettings(agentId, boothId, SETTINGS)).resolves.toEqual({
      ok: false,
      reason: "BOOTH_MANAGER_REQUIRED",
    });

    await savePaymentSettings(managerId, boothId, SETTINGS, new Date("2026-10-14T01:00:00.000Z"));
    await savePaymentSettings(managerId, boothId, SETTINGS, new Date("2026-10-14T02:00:00.000Z"));
    await savePaymentSettings(
      managerId,
      boothId,
      { ...SETTINGS, feePolicy: { ...SETTINGS.feePolicy, baseFee: 15000 } },
      new Date("2026-10-14T03:00:00.000Z"),
    );

    const [feePolicies, bankAccounts] = await Promise.all([
      prisma.boothFeePolicy.findMany({ where: { boothId }, orderBy: { id: "asc" } }),
      prisma.boothBankAccount.findMany({ where: { boothId } }),
    ]);
    expect(feePolicies.map(({ baseFee }) => baseFee)).toEqual([12000, 15000]);
    expect(bankAccounts).toHaveLength(1);
  });
});
