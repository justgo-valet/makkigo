import "server-only";

import { prisma } from "database";

import { toImageUrl } from "@/server/merchant/listOwnMerchants";

import { startOfSeoulDay } from "./seoulDay";

import type { Prisma } from "database";

const DEFAULT_CAR_IMAGE_PATH = "cars/_default.png";

const carImageSelect = { vehicle: { select: { model: { select: { imageUrl: true } } } } } as const;

interface ValetSessionScope {
  active: Prisma.ValetSessionWhereInput;
  completed: Prisma.ValetSessionWhereInput;
}

const carImageUrlOf =
  (imageBaseUrl: string) => (session: { vehicle: { model: { imageUrl: string } | null } | null }) =>
    toImageUrl(imageBaseUrl, session.vehicle?.model?.imageUrl ?? DEFAULT_CAR_IMAGE_PATH);

const completedTodayWhere = (scope: Prisma.ValetSessionWhereInput, now: Date) => ({
  AND: [scope, { status: "COMPLETED" as const, completedAt: { gte: startOfSeoulDay(now) } }],
});

const readActiveValetSessions = async (where: Prisma.ValetSessionWhereInput, imageBaseUrl: string) => {
  const toCarImageUrl = carImageUrlOf(imageBaseUrl);
  const sessions = await prisma.valetSession.findMany({
    where,
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
  });

  return sessions.map((session) => ({
    id: session.id,
    status: session.status,
    plateNumber: session.plateNumber,
    carImageUrl: toCarImageUrl(session),
    expectedArrivalAt: session.expectedArrivalAt?.toISOString() ?? null,
    arrivalDelayMinutes: session.arrivalDelayMinutes,
    parkedAt: session.parkedAt?.toISOString() ?? null,
    pickupRequestedAt: session.pickupRequestedAt?.toISOString() ?? null,
  }));
};

const readValetSessionLists = async (scope: ValetSessionScope, imageBaseUrl: string, now: Date) => {
  const toCarImageUrl = carImageUrlOf(imageBaseUrl);
  const [items, completed] = await Promise.all([
    readActiveValetSessions(scope.active, imageBaseUrl),
    prisma.valetSession.findMany({
      where: completedTodayWhere(scope.completed, now),
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
    items,
    completed: completed.map((session) => ({
      id: session.id,
      plateNumber: session.plateNumber,
      carImageUrl: toCarImageUrl(session),
      completedAt: session.completedAt?.toISOString(),
      fee: session.actualFee ?? session.baseFee,
    })),
  };
};

export { completedTodayWhere, readActiveValetSessions, readValetSessionLists };
