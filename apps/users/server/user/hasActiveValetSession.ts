import "server-only";
import { ACTIVE_VALET_SESSION_STATUSES, lockPlateNumber } from "database";

import type { Prisma } from "database";

const hasActiveValetSession = async (tx: Prisma.TransactionClient, userId: number) => {
  const vehicle = await tx.vehicle.findUnique({ where: { userId }, select: { plateNumber: true } });

  if (vehicle) await lockPlateNumber(tx, vehicle.plateNumber);

  const session = await tx.valetSession.findFirst({
    where: { userId, status: { in: [...ACTIVE_VALET_SESSION_STATUSES] } },
    select: { id: true },
  });

  return session !== null;
};

export { hasActiveValetSession };
