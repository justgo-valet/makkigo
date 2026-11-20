import "server-only";

import { prisma } from "database";

import { pageArgs } from "@/server/common/pagination";

import type { ValetSessionStatus } from "database";

export const listValetSessions = async ({ status, page }: { status: ValetSessionStatus | null; page: number }) => {
  const where = status ? { status } : {};
  const [sessions, total] = await prisma.$transaction([
    prisma.valetSession.findMany({
      where,
      orderBy: { id: "desc" },
      ...pageArgs(page),
      select: {
        id: true,
        status: true,
        plateNumber: true,
        baseFee: true,
        actualFee: true,
        createdAt: true,
        parkedAt: true,
        pickupRequestedAt: true,
        completedAt: true,
        cancelledAt: true,
        merchant: { select: { id: true, name: true } },
        booth: { select: { id: true, name: true } },
      },
    }),
    prisma.valetSession.count({ where }),
  ]);
  return { sessions, total };
};
