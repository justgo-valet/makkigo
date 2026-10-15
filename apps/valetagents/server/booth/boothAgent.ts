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

const findApprovedMembership = (staffId: number) =>
  prisma.boothAgent.findFirst({
    where: { staffId, status: "APPROVED", booth: { deletedAt: null } },
    orderBy: { id: "asc" },
    select: { boothId: true, notificationsEnabled: true, workStartTime: true, workEndTime: true },
  });

const setAgentNotifications = async (staffId: number, boothId: number, enabled: boolean) => {
  const failure = await getBoothAgentFailure(staffId, boothId);
  if (failure) return { ok: false, reason: failure } as const;

  await prisma.boothAgent.updateMany({
    where: { boothId, staffId, status: "APPROVED" },
    data: { notificationsEnabled: enabled },
  });
  return { ok: true } as const;
};

export { findApprovedMembership, getBoothAgentFailure, setAgentNotifications };
export type { BoothAgentFailure };
