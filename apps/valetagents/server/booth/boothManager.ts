import "server-only";

import { prisma } from "database";

type BoothManagerFailure = "BOOTH_NOT_FOUND" | "BOOTH_MANAGER_REQUIRED";

// 부스 관리자는 별도 계정 유형이 아니라 부스를 만든 사람이다.
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
