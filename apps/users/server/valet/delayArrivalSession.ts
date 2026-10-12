import "server-only";
import { prisma } from "database";

import type { DelayArrivalErrorCode, DelayArrivalRequest } from "@/libs/valet/contracts/arrival";

type DelayArrivalSessionResult = { ok: true } | { ok: false; reason: DelayArrivalErrorCode };

const MAX_DELAY_MINUTES = 15;

const formatDelay = (minutes: number) =>
  minutes >= MAX_DELAY_MINUTES ? `${minutes}분 이상` : `${minutes}분`;

const delayArrivalSession = async (
  userId: number,
  valetSessionId: number,
  { minutes }: DelayArrivalRequest,
): Promise<DelayArrivalSessionResult> =>
  prisma.$transaction(async (tx) => {
    const session = await tx.valetSession.findFirst({
      where: { id: valetSessionId, userId },
      select: { plateNumber: true, merchant: { select: { name: true } } },
    });

    if (!session) return { ok: false, reason: "SESSION_NOT_FOUND" } as const;

    const { count } = await tx.valetSession.updateMany({
      where: { id: valetSessionId, status: "ARRIVING" },
      data: { arrivalDelayMinutes: minutes, arrivalDelayedAt: new Date() },
    });

    if (count === 0) return { ok: false, reason: "NOT_DELAYABLE" } as const;

    const recipients = await tx.notification.findMany({
      where: { valetSessionId, type: "ARRIVAL", staffId: { not: null } },
      select: { staffId: true },
      distinct: ["staffId"],
    });
    const place = session.merchant ? `${session.merchant.name} · ` : "";

    await tx.notification.createMany({
      data: recipients.map(({ staffId }) => ({
        type: "ARRIVAL_DELAYED" as const,
        staffId,
        valetSessionId,
        title: "도착 지연",
        body: `${place}${session.plateNumber} 차량이 ${formatDelay(minutes)} 늦게 도착해요`,
      })),
    });

    return { ok: true } as const;
  });

export { delayArrivalSession };
