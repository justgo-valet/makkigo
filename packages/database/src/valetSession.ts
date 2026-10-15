import type { Prisma, ValetSessionStatus } from "../generated/prisma/client";

export const ACTIVE_VALET_SESSION_STATUSES = [
  "ARRIVING",
  "PARKED",
  "PICKUP_REQUESTED",
  "PICKUP_PREPARING",
] as const satisfies readonly ValetSessionStatus[];

export const lockPlateNumber = async (tx: Prisma.TransactionClient, plateNumber: string) => {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`valet_session:${plateNumber}`}))`;
};
