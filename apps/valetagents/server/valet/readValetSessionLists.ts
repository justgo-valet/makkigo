import "server-only";

import { prisma } from "database";

import { toImageUrl } from "@/server/merchant/listOwnMerchants";

import type { Prisma } from "database";

const DEFAULT_CAR_IMAGE_PATH = "cars/_default.png";
const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const startOfSeoulDay = (now: Date) =>
  new Date(Math.floor((now.getTime() + SEOUL_OFFSET_MS) / DAY_MS) * DAY_MS - SEOUL_OFFSET_MS);

const carImageSelect = { vehicle: { select: { model: { select: { imageUrl: true } } } } } as const;

interface ValetSessionScope {
  active: Prisma.ValetSessionWhereInput;
  completed: Prisma.ValetSessionWhereInput;
}

const readValetSessionLists = async (scope: ValetSessionScope, imageBaseUrl: string, now: Date) => {
  const toCarImageUrl = (session: { vehicle: { model: { imageUrl: string } | null } | null }) =>
    toImageUrl(imageBaseUrl, session.vehicle?.model?.imageUrl ?? DEFAULT_CAR_IMAGE_PATH);

  const [sessions, completed] = await Promise.all([
    prisma.valetSession.findMany({
      where: scope.active,
      orderBy: { id: "asc" },
      select: {
        id: true,
        status: true,
        plateNumber: true,
        expectedArrivalAt: true,
        arrivalDelayMinutes: true,
        parkedAt: true,
        pickupRequestedAt: true,
        ...carImageSelect,
      },
    }),
    prisma.valetSession.findMany({
      where: {
        AND: [scope.completed, { status: "COMPLETED", completedAt: { gte: startOfSeoulDay(now) } }],
      },
      orderBy: [{ completedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        plateNumber: true,
        completedAt: true,
        baseFee: true,
        actualFee: true,
        ...carImageSelect,
      },
    }),
  ]);

  return {
    items: sessions.map((session) => ({
      id: session.id,
      status: session.status,
      plateNumber: session.plateNumber,
      carImageUrl: toCarImageUrl(session),
      expectedArrivalAt: session.expectedArrivalAt?.toISOString() ?? null,
      arrivalDelayMinutes: session.arrivalDelayMinutes,
      parkedAt: session.parkedAt?.toISOString() ?? null,
      pickupRequestedAt: session.pickupRequestedAt?.toISOString() ?? null,
    })),
    completed: completed.map((session) => ({
      id: session.id,
      plateNumber: session.plateNumber,
      carImageUrl: toCarImageUrl(session),
      completedAt: session.completedAt?.toISOString(),
      fee: session.actualFee ?? session.baseFee,
    })),
  };
};

export { readValetSessionLists };
