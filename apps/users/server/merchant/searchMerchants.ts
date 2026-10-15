import "server-only";
import { prisma } from "database";

import { availableBoothWhere } from "@/server/merchant/availableBooth";

import type { MerchantsResponse } from "@/libs/merchant/contracts/merchants";

const SEARCH_RESULT_LIMIT = 20;

const searchMerchants = (query: string): Promise<MerchantsResponse> =>
  prisma.merchant.findMany({
    where: {
      deletedAt: null,
      booths: { some: availableBoothWhere(new Date()) },
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { address: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, address: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: SEARCH_RESULT_LIMIT,
  });

export { searchMerchants };
