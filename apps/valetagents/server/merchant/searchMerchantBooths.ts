import "server-only";

import { prisma } from "database";

import { MERCHANT_BOOTH_SEARCH_RESULT_LIMIT } from "@/libs/merchant/contracts/merchant-booths";

import type { MerchantBoothSearchResponse } from "@/libs/merchant/contracts/merchant-booths";

const searchMerchantBooths = async (query: string): Promise<MerchantBoothSearchResponse> => {
  const booths = await prisma.booth.findMany({
    where: {
      deletedAt: null,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { address: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, address: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: MERCHANT_BOOTH_SEARCH_RESULT_LIMIT,
  });

  return { items: booths };
};

export { searchMerchantBooths };
