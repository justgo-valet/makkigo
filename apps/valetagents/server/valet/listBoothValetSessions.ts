import "server-only";

import { prisma } from "database";

import { boothValetSessionListResponseSchema } from "@/libs/valet/contracts/sessions";
import { getBoothAgentFailure } from "@/server/booth/boothAgent";

import { readValetSessionLists } from "./readValetSessionLists";

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

  const [lists, membership] = await Promise.all([
    readValetSessionLists(
      {
        active: {
          OR: [
            {
              status: "ARRIVING",
              merchant: { booths: { some: { boothId, status: "APPROVED" } } },
            },
            { status: { in: ["PARKED", "PICKUP_REQUESTED", "PICKUP_PREPARING"] }, boothId },
          ],
        },
        completed: { boothId },
      },
      imageBaseUrl,
      now,
    ),
    prisma.boothAgent.findUnique({
      where: { boothId_staffId: { boothId, staffId } },
      select: { notificationsEnabled: true },
    }),
  ]);

  return {
    ok: true,
    value: boothValetSessionListResponseSchema.parse({
      ...lists,
      notificationsEnabled: membership?.notificationsEnabled ?? false,
    }),
  };
};

export { listBoothValetSessions };
