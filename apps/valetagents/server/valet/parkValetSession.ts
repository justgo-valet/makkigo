import "server-only";

import { prisma } from "database";

import { getBoothAgentFailure } from "@/server/booth/boothAgent";

import { findLatestTicketVersionId } from "./findLatestTicketVersionId";

import type { ParkedNotice } from "./notifyParked";
import type { BoothAgentFailure } from "@/server/booth/boothAgent";

type ParkValetSessionResult =
  | { ok: true; notice: ParkedNotice | null }
  | { ok: false; reason: BoothAgentFailure | "SESSION_NOT_FOUND" | "NOT_PARKABLE" };

const parkValetSession = async (
  staffId: number,
  boothId: number,
  valetSessionId: number,
  now = new Date(),
): Promise<ParkValetSessionResult> => {
  const failure = await getBoothAgentFailure(staffId, boothId);
  if (failure) return { ok: false, reason: failure };

  const session = await prisma.valetSession.findFirst({
    where: {
      id: valetSessionId,
      merchant: { booths: { some: { boothId, status: "APPROVED" } } },
    },
    select: {
      status: true,
      plateNumber: true,
      user: { select: { id: true, deletedAt: true } },
      merchant: { select: { id: true, name: true } },
    },
  });

  if (!session?.merchant) return { ok: false, reason: "SESSION_NOT_FOUND" };
  if (session.status !== "ARRIVING") return { ok: false, reason: "NOT_PARKABLE" };

  const { count } = await prisma.valetSession.updateMany({
    where: { id: valetSessionId, status: "ARRIVING" },
    data: {
      status: "PARKED",
      boothId,
      parkedAt: now,
      parkedById: staffId,
      ticketVersionId: await findLatestTicketVersionId(session.merchant.id),
    },
  });

  if (count === 0) return { ok: false, reason: "NOT_PARKABLE" };

  return {
    ok: true,
    notice:
      session.user && !session.user.deletedAt
        ? {
            userId: session.user.id,
            valetSessionId,
            plateNumber: session.plateNumber,
            merchantName: session.merchant.name,
          }
        : null,
  };
};

export { parkValetSession };
