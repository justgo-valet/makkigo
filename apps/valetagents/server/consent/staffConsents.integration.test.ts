import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { purgeIncompleteStaffSignups as PurgeIncompleteStaffSignups } from "./purgeIncompleteStaffSignups";
import type * as StaffConsents from "./staffConsents";
import type { PrismaClient, StaffRole } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;
const DAY_MS = 24 * 60 * 60 * 1000;

let prisma: PrismaClient;
let staffConsents: typeof StaffConsents;
let purgeIncompleteStaffSignups: typeof PurgeIncompleteStaffSignups;
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const staffIds: number[] = [];

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for staff consent integration tests");

  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to mutate database without a test name: ${databaseName}`);
  }
  return value;
};

const createStaff = async (label: string, role: StaffRole | null, daysAgo: number) => {
  const staff = await prisma.staff.create({
    data: {
      role,
      name: `integration-consent-${label}-${suffix}`,
      createdAt: new Date(Date.now() - daysAgo * DAY_MS),
      socialAccounts: {
        create: { provider: "KAKAO", providerUserId: `consent-${label}-${suffix}` },
      },
    },
    select: { id: true },
  });
  staffIds.push(staff.id);
  return staff.id;
};

const isWithdrawn = async (staffId: number) =>
  (await prisma.staff.findUniqueOrThrow({ where: { id: staffId }, select: { deletedAt: true } }))
    .deletedAt !== null;

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  staffConsents = await import("./staffConsents");
  ({ purgeIncompleteStaffSignups } = await import("./purgeIncompleteStaffSignups"));
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.staff.deleteMany({ where: { id: { in: staffIds } } });
  await prisma.$disconnect();
});

describe("staff consents database integration", () => {
  it("counts a staff as consented only after recording the partner documents", async () => {
    const staffId = await createStaff("new", null, 0);

    await expect(staffConsents.hasStaffConsents(staffId)).resolves.toBe(false);
    await staffConsents.recordStaffConsents(staffId);
    await expect(staffConsents.hasStaffConsents(staffId)).resolves.toBe(true);
  });

  it("removes only sign-ups that never consented nor chose a role for 30 days", async () => {
    const abandoned = await createStaff("abandoned", null, 31);
    const consented = await createStaff("consented", null, 31);
    await staffConsents.recordStaffConsents(consented);
    const existingAgent = await createStaff("existing", "VALET_AGENT", 31);
    const recent = await createStaff("recent", null, 10);

    await purgeIncompleteStaffSignups(new Date(), 100);

    await expect(isWithdrawn(abandoned)).resolves.toBe(true);
    await expect(prisma.staffSocialAccount.count({ where: { staffId: abandoned } })).resolves.toBe(
      0,
    );
    await expect(isWithdrawn(consented)).resolves.toBe(false);
    await expect(isWithdrawn(existingAgent)).resolves.toBe(false);
    await expect(isWithdrawn(recent)).resolves.toBe(false);
  });
});
