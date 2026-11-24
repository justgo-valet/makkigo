import "server-only";
import { prisma } from "database";

import { toMerchantNamePattern } from "@/server/merchant/merchantNamePattern";

import type { MerchantsResponse } from "@/libs/merchant/contracts/merchants";

const SEARCH_RESULT_LIMIT = 20;

const searchMerchants = (query: string): Promise<MerchantsResponse> =>
  prisma.$queryRaw<MerchantsResponse>`
    SELECT id, name, address
    FROM merchants
    WHERE deleted_at IS NULL AND name ~* ${toMerchantNamePattern(query)}
    ORDER BY name ASC, id ASC
    LIMIT ${SEARCH_RESULT_LIMIT}
  `;

export { searchMerchants };
