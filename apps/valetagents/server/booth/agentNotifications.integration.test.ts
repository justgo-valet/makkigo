import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { setAgentNotifications as SetAgentNotifications } from "./boothAgent";
import type { PrismaClient } from "database";

const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])test(?:$|[_-])/i;

let prisma: PrismaClient;
let setAgentNotifications: typeof SetAgentNotifications;
let agentId: number;
let requestedId: number;
let boothId: number;

const requireTestDatabaseUrl = () => {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error("TEST_DATABASE_URL is required for agent notification integration tests");

  const databaseName = new URL(value).pathname.replace(/^\//, "");
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(`Refusing to mutate database without a test name: ${databaseName}`);
  }
  return value;
};

beforeAll(async () => {
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  ({ prisma } = await import("database"));
  ({ setAgentNotifications } = await import("./boothAgent"));

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  [agentId, requestedId] = await Promise.all(
    ["agent", "requested"].map(
      async (label) =>
        (
          await prisma.staff.create({
            data: { role: "VALET_AGENT", name: `integration-notify-${label}-${suffix}` },
            select: { id: true },
          })
        ).id,
    ),
  );
  boothId = (
    await prisma.booth.create({
      data: {
        creatorId: agentId,
        name: `integration-notify-${suffix}`,
        address: "서울시 테스트구",
        agents: {
          create: [
            { staffId: agentId, status: "APPROVED" },
            { staffId: requestedId, status: "REQUESTED" },
          ],
        },
      },
      select: { id: true },
    })
  ).id;
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.booth.deleteMany({ where: { id: boothId } });
  await prisma.staff.deleteMany({ where: { id: { in: [agentId, requestedId] } } });
  await prisma.$disconnect();
});

describe("setAgentNotifications database integration", () => {
  it("lets an approved agent switch only their own notifications", async () => {
    await expect(setAgentNotifications(agentId, boothId, false)).resolves.toEqual({ ok: true });
    await expect(setAgentNotifications(requestedId, boothId, false)).resolves.toEqual({
      ok: false,
      reason: "BOOTH_AGENT_REQUIRED",
    });

    const agents = await prisma.boothAgent.findMany({
      where: { boothId },
      select: { staffId: true, notificationsEnabled: true },
    });
    expect(Object.fromEntries(agents.map((agent) => [agent.staffId, agent.notificationsEnabled]))).toEqual({
      [agentId]: false,
      [requestedId]: true,
    });
  });
});
