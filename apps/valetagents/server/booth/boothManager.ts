import "server-only";

import { prisma } from "database";

type BoothManagerFailure = "BOOTH_NOT_FOUND" | "BOOTH_MANAGER_REQUIRED";

const getBoothManagerFailure = async (
  staffId: number,
  boothId: number,
): Promise<BoothManagerFailure | null> => {
  const booth = await prisma.booth.findFirst({
    where: { id: boothId, deletedAt: null },
    select: { creatorId: true },
  });

  if (!booth) return "BOOTH_NOT_FOUND";
  return booth.creatorId === staffId ? null : "BOOTH_MANAGER_REQUIRED";
};

export { getBoothManagerFailure };
export type { BoothManagerFailure };
