import "server-only";

import { prisma } from "database";

import { boothValetSessionListResponseSchema } from "@/libs/valet/contracts/sessions";
import { getBoothAgentFailure } from "@/server/booth/boothAgent";

import { completedTodayWhere, readActiveValetSessions } from "./readValetSessionLists";

import type { BoothValetSessionListResponse } from "@/libs/valet/contracts/sessions";
import type { BoothAgentFailure } from "@/server/booth/boothAgent";

type ListBoothValetSessionsResult =
  | { ok: true; value: BoothValetSessionListResponse }
  | { ok: false; reason: BoothAgentFailure };

const listBoothValetSessions = async (
  staffId: number,
  boothId: number,
  imageBaseUrl: string,
  now = new Date(),
): Promise<ListBoothValetSessionsResult> => {
  const failure = await getBoothAgentFailure(staffId, boothId);
  if (failure) return { ok: false, reason: failure };

  const [items, completedCount, membership] = await Promise.all([
    readActiveValetSessions(
      {
        OR: [
          {
            status: "ARRIVING",
            merchant: { booths: { some: { boothId, status: "APPROVED" } } },
          },
          { status: { in: ["PARKED", "PICKUP_REQUESTED", "PICKUP_PREPARING"] }, boothId },
        ],
      },
      imageBaseUrl,
    ),
    prisma.valetSession.count({ where: completedTodayWhere({ boothId }, now) }),
    prisma.boothAgent.findUnique({
      where: { boothId_staffId: { boothId, staffId } },
      select: { notificationsEnabled: true },
    }),
  ]);

  return {
    ok: true,
    value: boothValetSessionListResponseSchema.parse({
      items,
      completedCount,
      notificationsEnabled: membership?.notificationsEnabled ?? false,
    }),
  };
};

export { listBoothValetSessions };
