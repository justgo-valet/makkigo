import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { createBooth as CreateBooth } from "./createBooth";
import type { searchBooths as SearchBooths } from "./searchBooths";
import type { getStaffOnboardingState as GetStaffOnboardingState } from "@/server/onboarding/getStaffOnboardingState";
import type { PrismaClient, StaffRole } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;
const DOUBLE_SUBMIT_ROUNDS = 10;
const MISSING_STAFF_ID = 2_147_483_647;

let prisma: PrismaClient;
let createBooth: typeof CreateBooth;
let searchBooths: typeof SearchBooths;
let getStaffOnboardingState: typeof GetStaffOnboardingState;
let otherBoothId: number;
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const fixtureIds = { booth: [] as number[], staff: [] as number[] };

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for booth integration tests");

  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to mutate database without a test name: ${databaseName}`);
  }
  return value;
};

const createStaff = async (role: StaffRole | null, deletedAt: Date | null = null) => {
  const staff = await prisma.staff.create({
    data: { role, deletedAt, name: `integration-create-booth-${suffix}` },
    select: { id: true },
  });
  fixtureIds.staff.push(staff.id);
  return staff.id;
};

const boothBody = (label: string) => ({
  name: `integration-${label}-${suffix}`,
  address: `서울시 테스트구 ${label}-${suffix}`,
  addressDetail: null,
});

const countCreatedBooths = (...staffIds: number[]) =>
  prisma.booth.count({ where: { creatorId: { in: staffIds } } });

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ createBooth } = await import("./createBooth"));
  ({ searchBooths } = await import("./searchBooths"));
  ({ getStaffOnboardingState } = await import("@/server/onboarding/getStaffOnboardingState"));

  const otherBooth = await prisma.booth.create({
    data: { creatorId: await createStaff("VALET_AGENT"), ...boothBody("other-booth") },
    select: { id: true },
  });
  otherBoothId = otherBooth.id;
  fixtureIds.booth.push(otherBoothId);
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.booth.deleteMany({
    where: { OR: [{ id: { in: fixtureIds.booth } }, { creatorId: { in: fixtureIds.staff } }] },
  });
  await prisma.staff.deleteMany({ where: { id: { in: fixtureIds.staff } } });
  await prisma.$disconnect();
});

describe("createBooth database integration", () => {
  it("creates the booth and its creator's approved membership together", async () => {
    const staffId = await createStaff("VALET_AGENT");
    const body = { ...boothBody("created"), addressDetail: "1층 로비" };

    const result = await createBooth(staffId, body);
    if (!result.ok) throw new Error(result.reason);

    await expect(
      prisma.booth.findMany({
        where: { creatorId: staffId },
        select: { id: true, name: true, address: true, addressDetail: true },
      }),
    ).resolves.toEqual([{ id: result.value.id, ...body }]);
    await expect(
      prisma.boothAgent.findMany({
        where: { staffId },
        select: { boothId: true, status: true, workStartTime: true, workEndTime: true },
      }),
    ).resolves.toEqual([
      { boothId: result.value.id, status: "APPROVED", workStartTime: null, workEndTime: null },
    ]);
    await expect(prisma.boothPhoto.count({ where: { boothId: result.value.id } })).resolves.toBe(0);
  });

  it("completes onboarding and makes the booth searchable by part of its name or address", async () => {
    const staffId = await createStaff("VALET_AGENT");
    const searcherId = await createStaff("VALET_AGENT");
    await expect(getStaffOnboardingState(staffId)).resolves.toMatchObject({ state: "BOOTH_REQUIRED" });

    const result = await createBooth(staffId, boothBody("searchable"));
    if (!result.ok) throw new Error(result.reason);

    await expect(getStaffOnboardingState(staffId)).resolves.toMatchObject({
      state: "COMPLETE",
      nextPath: "/",
    });
    const byName = await searchBooths(searcherId, `ion-searchable-${suffix}`);
    const byAddress = await searchBooths(searcherId, `테스트구 searchable-${suffix}`);
    expect(byName.items.map(({ id }) => id)).toEqual([result.value.id]);
    expect(byAddress.items.map(({ id }) => id)).toEqual([result.value.id]);
  });

  it("lets an agent who is still awaiting approval elsewhere create a booth", async () => {
    const staffId = await createStaff("VALET_AGENT");
    await prisma.boothAgent.create({ data: { boothId: otherBoothId, staffId } });

    const result = await createBooth(staffId, boothBody("awaiting"));

    expect(result.ok).toBe(true);
    await expect(
      prisma.boothAgent.findUniqueOrThrow({
        where: { boothId_staffId: { boothId: otherBoothId, staffId } },
        select: { status: true },
      }),
    ).resolves.toEqual({ status: "REQUESTED" });
  });

  it("refuses a merchant admin and an already approved agent without creating a booth", async () => {
    const merchantAdminId = await createStaff("MERCHANT_ADMIN");
    const approvedAgentId = await createStaff("VALET_AGENT");
    await prisma.boothAgent.create({
      data: { boothId: otherBoothId, staffId: approvedAgentId, status: "APPROVED" },
    });

    await expect(createBooth(merchantAdminId, boothBody("merchant-admin"))).resolves.toEqual({
      ok: false,
      reason: "VALET_AGENT_REQUIRED",
    });
    await expect(createBooth(approvedAgentId, boothBody("approved-agent"))).resolves.toEqual({
      ok: false,
      reason: "ALREADY_ONBOARDED",
    });

    await expect(countCreatedBooths(merchantAdminId, approvedAgentId)).resolves.toBe(0);
  });

  it("refuses a missing, deleted, or role-less staff without creating a booth", async () => {
    const deletedStaffId = await createStaff("VALET_AGENT", new Date());
    const roleLessStaffId = await createStaff(null);

    await expect(createBooth(MISSING_STAFF_ID, boothBody("missing-staff"))).resolves.toEqual({
      ok: false,
      reason: "AUTH_REQUIRED",
    });
    await expect(createBooth(deletedStaffId, boothBody("deleted-staff"))).resolves.toEqual({
      ok: false,
      reason: "AUTH_REQUIRED",
    });
    await expect(createBooth(roleLessStaffId, boothBody("role-less-staff"))).resolves.toEqual({
      ok: false,
      reason: "VALET_AGENT_REQUIRED",
    });

    await expect(
      countCreatedBooths(MISSING_STAFF_ID, deletedStaffId, roleLessStaffId),
    ).resolves.toBe(0);
  });

  // 한 번만 하면 두 호출이 우연히 차례로 돌아 격리 없이도 통과하므로 새 요원으로 되풀이한다.
  it("creates exactly one booth when the same agent submits twice at once", async () => {
    for (let round = 0; round < DOUBLE_SUBMIT_ROUNDS; round += 1) {
      const staffId = await createStaff("VALET_AGENT");

      const results = await Promise.all([
        createBooth(staffId, boothBody(`double-a-${round}`)),
        createBooth(staffId, boothBody(`double-b-${round}`)),
      ]);

      expect(results.filter((result) => result.ok)).toHaveLength(1);
      expect(results.filter((result) => !result.ok)).toEqual([
        { ok: false, reason: "ALREADY_ONBOARDED" },
      ]);
      await expect(countCreatedBooths(staffId)).resolves.toBe(1);
      await expect(prisma.boothAgent.count({ where: { staffId } })).resolves.toBe(1);
    }
  });
});
