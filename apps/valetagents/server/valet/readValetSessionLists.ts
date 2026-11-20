import "server-only";

import { prisma } from "database";

import { toImageUrl } from "@/server/common/imageUrl";

import { startOfSeoulDay } from "./seoulDay";

import type { Prisma } from "database";

const DEFAULT_CAR_IMAGE_PATH = "cars/_default.png";

const carImageSelect = { vehicle: { select: { model: { select: { imageUrl: true } } } } } as const;

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
      ticketNumber: true,
      expectedArrivalAt: true,
      arrivalDelayMinutes: true,
      parkedAt: true,
      pickupRequestedAt: true,
      baseFee: true,
      ...carImageSelect,
    },
  });

  return sessions.map((session) => ({
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
  }));
};

export { completedTodayWhere, readActiveValetSessions };
