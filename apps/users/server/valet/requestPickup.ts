import "server-only";
import { calculateValetFee, findFeePolicy, findLatestTicketVersionId, prisma } from "database";

import type { PickupRequestErrorCode } from "@/libs/valet/contracts/pickupRequest";
import type { ConsentType, Prisma } from "database";

type RequestPickupResult =
  | { ok: true; valetSessionId: number; notificationIds: number[] }
  | { ok: false; reason: PickupRequestErrorCode };

interface GuestPickup {
  merchantId: number;
  consents: { type: ConsentType; documentVersion: string }[];
}

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

const requestPickupWhere = (
  where: Prisma.ValetSessionWhereInput,
  now: Date,
  guest?: GuestPickup,
): Promise<RequestPickupResult> =>
  prisma.$transaction(async (tx) => {
    const session = await tx.valetSession.findFirst({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        status: true,
        plateNumber: true,
        boothId: true,
        parkedAt: true,
        merchantId: true,
        merchant: { select: { name: true } },
      },
    });

    if (!session) return { ok: false, reason: "SESSION_NOT_FOUND" } as const;
    if (session.status !== "PARKED") {
      return { ok: false, reason: getNotParkedReason(session.status) } as const;
    }

    const { id: valetSessionId, boothId, parkedAt } = session;

    if (boothId === null) return { ok: false, reason: "NO_BOOTH" } as const;

    const feePolicy = await findFeePolicy(tx, boothId, now);
    const baseFee =
      feePolicy && parkedAt ? calculateValetFee(feePolicy, parkedAt, now).total : null;
    const connectsMerchant = guest !== undefined && session.merchantId === null;

    const { count } = await tx.valetSession.updateMany({
      where: { id: valetSessionId, status: "PARKED" },
      data: {
        status: "PICKUP_REQUESTED",
        pickupRequestedAt: now,
        baseFee,
        ...(connectsMerchant && {
          merchantId: guest.merchantId,
          ticketVersionId: await findLatestTicketVersionId(tx, guest.merchantId),
        }),
      },
    });

    if (count === 0) return { ok: false, reason: "ALREADY_REQUESTED" } as const;

    if (guest) {
      await tx.guestConsent.createMany({
        data: guest.consents.map((consent) => ({ valetSessionId, ...consent })),
      });
    }

    const merchantName = connectsMerchant
      ? (await tx.merchant.findUnique({ where: { id: guest.merchantId }, select: { name: true } }))
          ?.name
      : session.merchant?.name;

    const agents = await tx.boothAgent.findMany({
      where: {
        boothId,
        status: "APPROVED",
        notificationsEnabled: true,
        staff: { deletedAt: null },
      },
      select: { staffId: true },
    });
    const place = merchantName ? `${merchantName} · ` : "";

    const notifications = await tx.notification.createManyAndReturn({
      data: agents.map(({ staffId }) => ({
        type: "PICKUP_REQUESTED" as const,
        staffId,
        valetSessionId,
        title: "출차 요청",
        body: `${place}${session.plateNumber} 차량의 출차 요청이 왔어요`,
      })),
      select: { id: true },
    });

    return {
      ok: true,
      valetSessionId,
      notificationIds: notifications.map(({ id }) => id),
    } as const;
  });

const requestPickup = (userId: number, valetSessionId: number, now: Date = new Date()) =>
  requestPickupWhere({ id: valetSessionId, userId }, now);

export { requestPickup, requestPickupWhere };
export type { GuestPickup, RequestPickupResult };
