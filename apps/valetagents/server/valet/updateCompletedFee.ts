import "server-only";

import { prisma } from "database";

import { getBoothAgentFailure } from "@/server/booth/boothAgent";

import type { BoothAgentFailure } from "@/server/booth/boothAgent";

type UpdateCompletedFeeResult =
  { ok: true } | { ok: false; reason: BoothAgentFailure | "SESSION_NOT_FOUND" };

const updateCompletedFee = async (
  staffId: number,
  boothId: number,
  valetSessionId: number,
  fee: number,
): Promise<UpdateCompletedFeeResult> => {
  const failure = await getBoothAgentFailure(staffId, boothId);
  if (failure) return { ok: false, reason: failure };

  const { count } = await prisma.valetSession.updateMany({
    where: { id: valetSessionId, boothId, status: "COMPLETED" },
    data: { actualFee: fee },
  });

  return count > 0 ? { ok: true } : { ok: false, reason: "SESSION_NOT_FOUND" };
};

export { updateCompletedFee };
