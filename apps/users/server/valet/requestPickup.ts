import "server-only";
import { calculateValetFee, findFeePolicy, prisma } from "database";

import type { PickupRequestErrorCode } from "@/libs/valet/contracts/pickupRequest";

type RequestPickupResult = { ok: true } | { ok: false; reason: PickupRequestErrorCode };

const getNotParkedReason = (status: string): PickupRequestErrorCode => {
  switch (status) {
    case "ARRIVING":
      return "NOT_PARKED";
    case "PICKUP_REQUESTED":
    case "PICKUP_PREPARING":
      return "ALREADY_REQUESTED";
    default:
      return "SESSION_NOT_FOUND";
  }
};

const requestPickup = async (
  userId: number,
  valetSessionId: number,
  now: Date = new Date(),
): Promise<RequestPickupResult> =>
  prisma.$transaction(async (tx) => {
    const session = await tx.valetSession.findFirst({
      where: { id: valetSessionId, userId },
      select: {
        status: true,
        plateNumber: true,
        boothId: true,
        parkedAt: true,
        merchant: { select: { name: true } },
      },
    });

    if (!session) return { ok: false, reason: "SESSION_NOT_FOUND" } as const;
    if (session.status !== "PARKED") {
      return { ok: false, reason: getNotParkedReason(session.status) } as const;
    }

    const { boothId, parkedAt } = session;

    if (boothId === null) return { ok: false, reason: "NO_BOOTH" } as const;

    const feePolicy = await findFeePolicy(tx, boothId, now);
    const baseFee =
      feePolicy && parkedAt ? calculateValetFee(feePolicy, parkedAt, now).total : null;

    const { count } = await tx.valetSession.updateMany({
      where: { id: valetSessionId, userId, status: "PARKED" },
      data: { status: "PICKUP_REQUESTED", pickupRequestedAt: now, baseFee },
    });

    if (count === 0) return { ok: false, reason: "ALREADY_REQUESTED" } as const;

    const agents = await tx.boothAgent.findMany({
      where: {
        boothId,
        status: "APPROVED",
        notificationsEnabled: true,
        staff: { deletedAt: null },
      },
      select: { staffId: true },
    });
    const place = session.merchant ? `${session.merchant.name} · ` : "";

    await tx.notification.createMany({
      data: agents.map(({ staffId }) => ({
        type: "PICKUP_REQUESTED" as const,
        staffId,
        valetSessionId,
        title: "출차 요청",
        body: `${place}${session.plateNumber} 차량의 출차 요청이 왔어요`,
      })),
    });

    return { ok: true } as const;
  });

export { requestPickup };
