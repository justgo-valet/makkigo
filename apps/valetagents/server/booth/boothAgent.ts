import "server-only";

import { prisma } from "database";

type BoothAgentFailure = "BOOTH_NOT_FOUND" | "BOOTH_AGENT_REQUIRED";

const getBoothAgentFailure = async (
  staffId: number,
  boothId: number,
): Promise<BoothAgentFailure | null> => {
  const booth = await prisma.booth.findFirst({
    where: { id: boothId, deletedAt: null },
    select: { agents: { where: { staffId, status: "APPROVED" }, select: { id: true } } },
  });

  if (!booth) return "BOOTH_NOT_FOUND";
  return booth.agents.length > 0 ? null : "BOOTH_AGENT_REQUIRED";
};

const findApprovedBoothId = async (staffId: number) => {
  const agent = await prisma.boothAgent.findFirst({
    where: { staffId, status: "APPROVED", booth: { deletedAt: null } },
    orderBy: { id: "asc" },
    select: { boothId: true },
  });

  return agent?.boothId ?? null;
};

export { findApprovedBoothId, getBoothAgentFailure };
export type { BoothAgentFailure };
