import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { syncAgentNotifications as SyncAgentNotifications } from "./syncAgentNotifications";
import type { PrismaClient } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

let prisma: PrismaClient;
let syncAgentNotifications: typeof SyncAgentNotifications;
let boothId: number;
const staffIds: number[] = [];

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for notification sync integration tests");

  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to mutate database without a test name: ${databaseName}`);
  }
  return value;
};

const time = (value: string) => new Date(`1970-01-01T${value}:00.000Z`);

const createAgent = async (
  label: string,
  workStart: string,
  workEnd: string,
  notificationsEnabled: boolean,
  updatedAt: string,
) => {
  const staff = await prisma.staff.create({
    data: { role: "VALET_AGENT", name: `integration-sync-${label}-${Date.now()}` },
    select: { id: true },
  });
  staffIds.push(staff.id);
  const agent = await prisma.boothAgent.create({
    data: {
      boothId,
      staffId: staff.id,
      status: "APPROVED",
      workStartTime: time(workStart),
      workEndTime: time(workEnd),
      notificationsEnabled,
    },
    select: { id: true },
  });
  await prisma.$executeRaw`UPDATE booth_agents SET updated_at = ${new Date(updatedAt)} WHERE id = ${agent.id}`;
  return agent.id;
};

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ syncAgentNotifications } = await import("./syncAgentNotifications"));

  const creator = await prisma.staff.create({
    data: { role: "VALET_AGENT", name: `integration-sync-creator-${Date.now()}` },
    select: { id: true },
  });
  staffIds.push(creator.id);
  boothId = (
    await prisma.booth.create({
      data: { creatorId: creator.id, name: "integration-sync", address: "서울시 테스트구" },
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

describe("syncAgentNotifications database integration", () => {
  it("follows the work-time boundary that just passed unless the agent changed it afterwards", async () => {
    const started = await createAgent("started", "09:00", "18:00", false, "2026-10-13T23:00:00.000Z");
    const changedAfter = await createAgent("changed", "09:00", "18:00", false, "2026-10-14T00:01:00.000Z");
    const longAgo = await createAgent("long-ago", "08:00", "18:00", false, "2026-10-13T22:00:00.000Z");
    const nightEnded = await createAgent("night", "22:00", "09:00", true, "2026-10-13T23:00:00.000Z");

    await syncAgentNotifications(new Date("2026-10-14T00:02:00.000Z"));

    const agents = await prisma.boothAgent.findMany({
      where: { id: { in: [started, changedAfter, longAgo, nightEnded] } },
      select: { id: true, notificationsEnabled: true },
    });
    expect(Object.fromEntries(agents.map((agent) => [agent.id, agent.notificationsEnabled]))).toEqual({
      [started]: true,
      [changedAfter]: false,
      [longAgo]: false,
      [nightEnded]: false,
    });
  });
});
