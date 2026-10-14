import "server-only";
import { prisma } from "database";

import type { ValetFeePolicy } from "@/server/valet/calculateValetFee";
import type { Prisma } from "database";

const findFeePolicy = (
  boothId: number,
  baseTime: Date,
  client: Prisma.TransactionClient = prisma,
): Promise<ValetFeePolicy | null> =>
  client.boothFeePolicy.findFirst({
    where: { boothId, effectiveFrom: { lte: baseTime } },
    orderBy: [{ effectiveFrom: "desc" }, { id: "desc" }],
    select: { baseMinutes: true, baseFee: true, extraUnitMinutes: true, extraUnitFee: true },
  });

export { findFeePolicy };
