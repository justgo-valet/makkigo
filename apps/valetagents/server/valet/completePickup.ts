import "server-only";

import { prisma } from "database";

import { getBoothAgentFailure } from "@/server/booth/boothAgent";

import type { PickupCompletedNotice } from "./notifyPickupCompleted";
import type { BoothAgentFailure } from "@/server/booth/boothAgent";

type CompletePickupResult =
  | { ok: true; notice: PickupCompletedNotice | null }
  | { ok: false; reason: BoothAgentFailure | "SESSION_NOT_FOUND" | "NOT_COMPLETABLE" };

const completePickup = async (
  staffId: number,
  boothId: number,
  valetSessionId: number,
  now = new Date(),
): Promise<CompletePickupResult> => {
  const failure = await getBoothAgentFailure(staffId, boothId);
  if (failure) return { ok: false, reason: failure };

  const session = await prisma.valetSession.findFirst({
    where: { id: valetSessionId, boothId },
    select: {
      status: true,
      plateNumber: true,
      user: { select: { id: true, deletedAt: true } },
      merchant: { select: { name: true } },
    },
  });

  if (!session) return { ok: false, reason: "SESSION_NOT_FOUND" };
  if (session.status !== "PICKUP_PREPARING") return { ok: false, reason: "NOT_COMPLETABLE" };

  const { count } = await prisma.valetSession.updateMany({
    where: { id: valetSessionId, boothId, status: "PICKUP_PREPARING" },
    data: { status: "COMPLETED", completedAt: now, completedById: staffId },
  });

  if (count === 0) return { ok: false, reason: "NOT_COMPLETABLE" };

  return {
    ok: true,
    notice:
      session.user && !session.user.deletedAt
        ? {
            userId: session.user.id,
            valetSessionId,
            plateNumber: session.plateNumber,
            merchantName: session.merchant?.name ?? null,
          }
        : null,
  };
};

export { completePickup };
