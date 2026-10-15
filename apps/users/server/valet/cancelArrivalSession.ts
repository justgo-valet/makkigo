import "server-only";
import { prisma } from "database";

import type { CancelArrivalErrorCode } from "@/libs/valet/contracts/arrival";

type CancelArrivalSessionResult =
  | { ok: true; notificationIds: number[] }
  | { ok: false; reason: CancelArrivalErrorCode };

const cancelArrivalSession = async (
  userId: number,
  valetSessionId: number,
): Promise<CancelArrivalSessionResult> =>
  prisma.$transaction(async (tx) => {
    const session = await tx.valetSession.findFirst({
      where: { id: valetSessionId, userId },
      select: { status: true, plateNumber: true, merchant: { select: { name: true } } },
    });

    if (!session) return { ok: false, reason: "SESSION_NOT_FOUND" } as const;

    const { count } = await tx.valetSession.updateMany({
      where: { id: valetSessionId, status: "ARRIVING" },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    if (count === 0) return { ok: false, reason: "NOT_CANCELLABLE" } as const;

    const recipients = await tx.notification.findMany({
      where: { valetSessionId, type: "ARRIVAL", staffId: { not: null } },
      select: { staffId: true },
      distinct: ["staffId"],
    });
    const place = session.merchant ? `${session.merchant.name} · ` : "";

    const notifications = await tx.notification.createManyAndReturn({
      data: recipients.map(({ staffId }) => ({
        type: "ARRIVAL_CANCELLED" as const,
        staffId,
        valetSessionId,
        title: "도착 알림 취소",
        body: `${place}${session.plateNumber} 차량의 도착 알림이 취소됐어요`,
      })),
      select: { id: true },
    });

    return { ok: true, notificationIds: notifications.map(({ id }) => id) } as const;
  });

export { cancelArrivalSession };
