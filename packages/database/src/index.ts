import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";

export * from "../generated/prisma/client";

const createPrismaClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { ACTIVE_VALET_SESSION_STATUSES, lockPlateNumber } from "./valetSession";
export { calculateValetFee } from "./valetFee";
