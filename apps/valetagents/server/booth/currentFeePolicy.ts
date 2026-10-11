import "server-only";

import type { Prisma } from "database";

const selectCurrentFeePolicy = (now: Date) =>
  ({
    where: { effectiveFrom: { lte: now } },
    select: {
      baseMinutes: true,
      baseFee: true,
      extraUnitMinutes: true,
      extraUnitFee: true,
      effectiveFrom: true,
    },
    orderBy: [{ effectiveFrom: "desc" }, { id: "desc" }],
    take: 1,
  }) satisfies Prisma.Booth$feePoliciesArgs;

export { selectCurrentFeePolicy };
