import "server-only";

import { prisma } from "database";

import { getBoothAgentFailure } from "@/server/booth/boothAgent";
import { listContractedMerchants } from "@/server/booth/listContractedMerchants";

import { seoulDayRange, toSeoulDate } from "./seoulDay";

import type { CompletedHistory } from "@/libs/valet/contracts/completed-history";
import type { BoothAgentFailure } from "@/server/booth/boothAgent";

type ListCompletedValetSessionsResult =
  | { ok: true; value: CompletedHistory }
  | { ok: false; reason: BoothAgentFailure };

const listCompletedValetSessions = async (
  staffId: number,
  boothId: number,
  date: string,
  now = new Date(),
): Promise<ListCompletedValetSessionsResult> => {
  const failure = await getBoothAgentFailure(staffId, boothId);
  if (failure) return { ok: false, reason: failure };

  const [sessions, contracts, booth] = await Promise.all([
    prisma.valetSession.findMany({
      where: { boothId, status: "COMPLETED", completedAt: seoulDayRange(date) },
      orderBy: [{ completedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        plateNumber: true,
        parkedAt: true,
        completedAt: true,
        baseFee: true,
        actualFee: true,
        merchant: { select: { id: true, name: true } },
      },
    }),
    listContractedMerchants(boothId),
    prisma.booth.findUniqueOrThrow({ where: { id: boothId }, select: { createdAt: true } }),
  ]);

  const merchants = new Map(contracts.map((merchant) => [merchant.id, merchant]));
  for (const { merchant } of sessions) if (merchant) merchants.set(merchant.id, merchant);

  return {
    ok: true,
    value: {
      date,
      today: toSeoulDate(now),
      firstYear: Number(toSeoulDate(booth.createdAt).slice(0, 4)),
      merchants: [...merchants.values()],
      items: sessions.map((session) => ({
        id: session.id,
        plateNumber: session.plateNumber,
        merchant: session.merchant,
        parkedAt: session.parkedAt?.toISOString() ?? null,
        completedAt: session.completedAt?.toISOString() ?? "",
        fee: session.actualFee ?? session.baseFee,
      })),
    },
  };
};

export { listCompletedValetSessions };
