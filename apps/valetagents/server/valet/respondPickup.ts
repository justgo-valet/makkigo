import "server-only";

import { prisma } from "database";

import { getBoothAgentFailure } from "@/server/booth/boothAgent";

import type { PickupRespondedNotice } from "./notifyPickupResponded";
import type { PickupResponseRequest } from "@/libs/valet/contracts/pickup-response";
import type { BoothAgentFailure } from "@/server/booth/boothAgent";

const MINUTE_MS = 60_000;

type RespondPickupResult =
  | { ok: true; notice: PickupRespondedNotice | null }
  | { ok: false; reason: BoothAgentFailure | "SESSION_NOT_FOUND" | "NOT_RESPONDABLE" };

const respondPickup = async (
  staffId: number,
  boothId: number,
  valetSessionId: number,
  { actualFee, expectedPickupMinutes }: PickupResponseRequest,
  now = new Date(),
): Promise<RespondPickupResult> => {
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
  if (session.status !== "PICKUP_REQUESTED") return { ok: false, reason: "NOT_RESPONDABLE" };

  const { count } = await prisma.valetSession.updateMany({
    where: { id: valetSessionId, boothId, status: "PICKUP_REQUESTED" },
    data: {
      status: "PICKUP_PREPARING",
      pickupRespondedAt: now,
      pickupRespondedById: staffId,
      actualFee,
      expectedPickupAt: new Date(
        Math.ceil((now.getTime() + expectedPickupMinutes * MINUTE_MS) / MINUTE_MS) * MINUTE_MS,
      ),
    },
  });

  if (count === 0) return { ok: false, reason: "NOT_RESPONDABLE" };

  return {
    ok: true,
    notice:
      session.user && !session.user.deletedAt
        ? {
            userId: session.user.id,
            valetSessionId,
            plateNumber: session.plateNumber,
            merchantName: session.merchant?.name ?? null,
            actualFee,
            expectedPickupMinutes,
          }
        : null,
  };
};

export { respondPickup };
