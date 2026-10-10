import "server-only";

import { prisma } from "database";

import { BOOTH_SEARCH_RESULT_LIMIT } from "@/libs/booth/contracts/booths";

import { serializeRequestWithoutBooth, serializeSelectedBooth } from "./serializeBooth";

import type { BoothSearchResponse } from "@/libs/booth/contracts/agent-request";

const searchBooths = async (staffId: number, query: string): Promise<BoothSearchResponse> => {
  const booths = await prisma.booth.findMany({
    where: {
      deletedAt: null,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { address: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      address: true,
      addressDetail: true,
      feePolicies: {
        select: {
          baseMinutes: true,
          baseFee: true,
          extraUnitMinutes: true,
          extraUnitFee: true,
          effectiveFrom: true,
        },
        orderBy: [{ effectiveFrom: "desc" }, { id: "desc" }],
        take: 1,
      },
      agents: {
        where: { staffId },
        select: {
          id: true,
          status: true,
          workStartTime: true,
          workEndTime: true,
          createdAt: true,
          updatedAt: true,
        },
        take: 1,
      },
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: BOOTH_SEARCH_RESULT_LIMIT,
  });

  return {
    items: booths.map((booth) => ({
      ...serializeSelectedBooth(booth),
      request: booth.agents[0] ? serializeRequestWithoutBooth(booth.agents[0]) : null,
    })),
  };
};

export { searchBooths };
