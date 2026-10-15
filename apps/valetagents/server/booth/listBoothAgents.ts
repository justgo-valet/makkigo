import "server-only";

import { prisma } from "database";

import { BOOTH_AGENT_PAGE_SIZE } from "@/libs/booth/contracts/agents";
import { isWithinWorkTime, toSeoulWorkTime } from "@/libs/booth/workTime";

import { getBoothManagerFailure } from "./boothManager";
import { serializeWorkTime } from "./workTime";

import type { BoothManagerFailure } from "./boothManager";
import type { BoothAgentListResponse } from "@/libs/booth/contracts/agents";
import type { BoothAgentStatus } from "database";

const STATUS_ORDER: BoothAgentStatus[] = ["APPROVED", "REQUESTED", "REJECTED"];

const activeAgents = (boothId: number) => ({ boothId, staff: { deletedAt: null } });

const findAgents = (boothId: number, status: BoothAgentStatus, skip: number, take: number) =>
  prisma.boothAgent.findMany({
    where: { ...activeAgents(boothId), status },
    orderBy: { id: "asc" },
    skip,
    take,
    select: {
      id: true,
      status: true,
      workStartTime: true,
      workEndTime: true,
      notificationsEnabled: true,
      updatedAt: true,
      staff: { select: { name: true } },
    },
  });

type ListBoothAgentsResult =
  | { ok: true; value: BoothAgentListResponse }
  | { ok: false; reason: BoothManagerFailure };

const listBoothAgents = async (
  staffId: number,
  boothId: number,
  page: number,
  now = new Date(),
): Promise<ListBoothAgentsResult> => {
  const failure = await getBoothManagerFailure(staffId, boothId);
  if (failure) return { ok: false, reason: failure };

  const groups = await prisma.boothAgent.groupBy({
    by: ["status"],
    where: activeAgents(boothId),
    _count: { _all: true },
  });
  const counts = STATUS_ORDER.map(
    (status) => groups.find((group) => group.status === status)?._count._all ?? 0,
  );
  const total = counts.reduce((sum, count) => sum + count, 0);
  const agents: Awaited<ReturnType<typeof findAgents>> = [];
  let skip = (page - 1) * BOOTH_AGENT_PAGE_SIZE;

  for (const [index, status] of STATUS_ORDER.entries()) {
    const take = BOOTH_AGENT_PAGE_SIZE - agents.length;
    if (take > 0 && skip < counts[index]) {
      agents.push(...(await findAgents(boothId, status, skip, take)));
    }
    skip = Math.max(0, skip - counts[index]);
  }
  const currentTime = toSeoulWorkTime(now);

  return {
    ok: true,
    value: {
      items: agents.map((agent) => {
        const workStartTime = serializeWorkTime(agent.workStartTime);
        const workEndTime = serializeWorkTime(agent.workEndTime);

        return {
          id: agent.id,
          name: agent.staff.name,
          status: agent.status,
          workStartTime,
          workEndTime,
          working:
            agent.status === "APPROVED" &&
            agent.notificationsEnabled &&
            workStartTime !== null &&
            workEndTime !== null &&
            isWithinWorkTime(workStartTime, workEndTime, currentTime),
          updatedAt: agent.updatedAt.toISOString(),
        };
      }),
      page,
      totalPages: Math.max(1, Math.ceil(total / BOOTH_AGENT_PAGE_SIZE)),
    },
  };
};

export { listBoothAgents };
