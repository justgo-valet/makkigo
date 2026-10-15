import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { listBoothAgents as ListBoothAgents } from "./listBoothAgents";
import type { BoothAgentStatus, PrismaClient } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

let prisma: PrismaClient;
let listBoothAgents: typeof ListBoothAgents;
let suffix: string;
let managerId: number;
let boothId: number;
const staffIds: number[] = [];

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for booth agent integration tests");

  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to mutate database without a test name: ${databaseName}`);
  }
  return value;
};

const createStaff = async (label: string, deletedAt: Date | null = null) => {
  const staff = await prisma.staff.create({
    data: { role: "VALET_AGENT", name: `integration-${label}-${suffix}`, deletedAt },
    select: { id: true },
  });
  staffIds.push(staff.id);
  return staff.id;
};

const createMembership = async (status: BoothAgentStatus, deletedAt: Date | null = null) =>
  (
    await prisma.boothAgent.create({
      data: { boothId, staffId: await createStaff(status.toLowerCase(), deletedAt), status },
      select: { id: true },
    })
  ).id;

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ listBoothAgents } = await import("./listBoothAgents"));

  suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  managerId = await createStaff("manager");
  boothId = (
    await prisma.booth.create({
      data: { creatorId: managerId, name: `integration-booth-${suffix}`, address: "서울시 테스트구" },
      select: { id: true },
    })
  ).id;
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.booth.deleteMany({ where: { id: boothId } });
  await prisma.staff.deleteMany({ where: { id: { in: staffIds } } });
  await prisma.$disconnect();
});

describe("listBoothAgents database integration", () => {
  it("lists registered, then requested, then rejected agents in request order across pages", async () => {
    const memberships: Record<BoothAgentStatus, number[]> = { APPROVED: [], REQUESTED: [], REJECTED: [] };
    for (let round = 0; round < 4; round += 1) {
      for (const status of ["REJECTED", "REQUESTED", "APPROVED"] as const) {
        memberships[status].push(await createMembership(status));
      }
    }
    await createMembership("APPROVED", new Date());
    const expected = [...memberships.APPROVED, ...memberships.REQUESTED, ...memberships.REJECTED];

    const first = await listBoothAgents(managerId, boothId, 1);
    const second = await listBoothAgents(managerId, boothId, 2);

    expect(first.ok && first.value.items.map(({ id }) => id)).toEqual(expected.slice(0, 10));
    expect(second.ok && second.value.items.map(({ id }) => id)).toEqual(expected.slice(10));
    expect(second.ok && second.value.totalPages).toBe(2);
  });
});
