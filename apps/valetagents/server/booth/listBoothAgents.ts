import "server-only";

import { prisma } from "database";

import { BOOTH_AGENT_PAGE_SIZE } from "@/libs/booth/contracts/agents";
import { isWithinWorkTime, toSeoulWorkTime } from "@/libs/booth/workTime";

import { getBoothManagerFailure } from "./boothManager";
import { serializeWorkTime } from "./workTime";

import type { BoothManagerFailure } from "./boothManager";
import type { BoothAgentListResponse } from "@/libs/booth/contracts/agents";

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

  const where = { boothId, staff: { deletedAt: null } };
  const [total, agents] = await Promise.all([
    prisma.boothAgent.count({ where }),
    prisma.boothAgent.findMany({
      where,
      orderBy: { id: "asc" },
      skip: (page - 1) * BOOTH_AGENT_PAGE_SIZE,
      take: BOOTH_AGENT_PAGE_SIZE,
      select: {
        id: true,
        status: true,
        workStartTime: true,
        workEndTime: true,
        notificationsEnabled: true,
        updatedAt: true,
        staff: { select: { name: true } },
      },
    }),
  ]);
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
