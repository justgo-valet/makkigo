import "server-only";

import { prisma } from "database";

import { boothValetSessionListResponseSchema } from "@/libs/valet/contracts/sessions";
import { getBoothAgentFailure } from "@/server/booth/boothAgent";
import { toImageUrl } from "@/server/merchant/listOwnMerchants";

import type { BoothValetSessionListResponse } from "@/libs/valet/contracts/sessions";
import type { BoothAgentFailure } from "@/server/booth/boothAgent";

const DEFAULT_CAR_IMAGE_PATH = "cars/_default.png";

type ListBoothValetSessionsResult =
  | { ok: true; value: BoothValetSessionListResponse }
  | { ok: false; reason: BoothAgentFailure };

const listBoothValetSessions = async (
  staffId: number,
  boothId: number,
  imageBaseUrl: string,
): Promise<ListBoothValetSessionsResult> => {
  const failure = await getBoothAgentFailure(staffId, boothId);
  if (failure) return { ok: false, reason: failure };

  const sessions = await prisma.valetSession.findMany({
    where: {
      OR: [
        {
          status: "ARRIVING",
          merchant: { booths: { some: { boothId, status: "APPROVED" } } },
        },
        { status: { in: ["PARKED", "PICKUP_REQUESTED", "PICKUP_PREPARING"] }, boothId },
      ],
    },
    orderBy: { id: "asc" },
    select: {
      id: true,
      status: true,
      plateNumber: true,
      expectedArrivalAt: true,
      arrivalDelayMinutes: true,
      parkedAt: true,
      expectedPickupAt: true,
      vehicle: { select: { model: { select: { imageUrl: true } } } },
    },
  });

  return {
    ok: true,
    value: boothValetSessionListResponseSchema.parse({
      items: sessions.map((session) => ({
        id: session.id,
        status: session.status,
        plateNumber: session.plateNumber,
        carImageUrl: toImageUrl(
          imageBaseUrl,
          session.vehicle?.model?.imageUrl ?? DEFAULT_CAR_IMAGE_PATH,
        ),
        expectedArrivalAt: session.expectedArrivalAt?.toISOString() ?? null,
        arrivalDelayMinutes: session.arrivalDelayMinutes,
        parkedAt: session.parkedAt?.toISOString() ?? null,
        expectedPickupAt: session.expectedPickupAt?.toISOString() ?? null,
      })),
    }),
  };
};

export { listBoothValetSessions };
