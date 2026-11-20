import "server-only";

import { prisma } from "database";

import { valetSessionListResponseSchema } from "@/libs/valet/contracts";
import { toImageUrl } from "@/server/common/toImageUrl";

import type { ValetSessionListResponse } from "@/libs/valet/contracts";

const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CAR_IMAGE_PATH = "cars/_default.png";

const startOfSeoulDay = (now: Date) =>
  new Date(Math.floor((now.getTime() + SEOUL_OFFSET_MS) / DAY_MS) * DAY_MS - SEOUL_OFFSET_MS);

const carImageSelect = { vehicle: { select: { model: { select: { imageUrl: true } } } } } as const;

const listMerchantValetSessions = async (
  merchantId: number,
  imageBaseUrl: string,
  now = new Date(),
): Promise<ValetSessionListResponse> => {
  const toCarImageUrl = (session: { vehicle: { model: { imageUrl: string } | null } | null }) =>
    toImageUrl(imageBaseUrl, session.vehicle?.model?.imageUrl ?? DEFAULT_CAR_IMAGE_PATH);

  const [active, completed] = await Promise.all([
    prisma.valetSession.findMany({
      where: { merchantId, status: { in: ["ARRIVING", "PARKED", "PICKUP_REQUESTED", "PICKUP_PREPARING"] } },
      orderBy: { id: "asc" },
      select: {
        id: true,
        status: true,
        plateNumber: true,
        ticketNumber: true,
        expectedArrivalAt: true,
        arrivalDelayMinutes: true,
        parkedAt: true,
        pickupRequestedAt: true,
        baseFee: true,
        ...carImageSelect,
      },
    }),
    prisma.valetSession.findMany({
      where: { merchantId, status: "COMPLETED", completedAt: { gte: startOfSeoulDay(now) } },
      orderBy: [{ completedAt: "desc" }, { id: "desc" }],
      select: { id: true, plateNumber: true, ticketNumber: true, completedAt: true, baseFee: true, actualFee: true, ...carImageSelect },
    }),
  ]);

  return valetSessionListResponseSchema.parse({
    items: active.map((session) => ({
      id: session.id,
      status: session.status,
      plateNumber: session.plateNumber,
      ticketNumber: session.ticketNumber,
      carImageUrl: toCarImageUrl(session),
      expectedArrivalAt: session.expectedArrivalAt?.toISOString() ?? null,
      arrivalDelayMinutes: session.arrivalDelayMinutes,
      parkedAt: session.parkedAt?.toISOString() ?? null,
      pickupRequestedAt: session.pickupRequestedAt?.toISOString() ?? null,
      fee: session.baseFee,
    })),
    completed: completed.map((session) => ({
      id: session.id,
      plateNumber: session.plateNumber,
      ticketNumber: session.ticketNumber,
      carImageUrl: toCarImageUrl(session),
      completedAt: session.completedAt?.toISOString(),
      fee: session.actualFee ?? session.baseFee,
    })),
  });
};

export { listMerchantValetSessions };
