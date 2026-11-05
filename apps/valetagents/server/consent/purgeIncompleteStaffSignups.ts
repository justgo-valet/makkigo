import "server-only";

import { prisma } from "database";

import { withdrawStaff } from "@/server/auth/withdrawStaff";

import type { Prisma } from "database";

const INCOMPLETE_SIGNUP_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const incompleteSignupWhere = (now: Date): Prisma.StaffWhereInput => ({
  role: null,
  deletedAt: null,
  consents: { none: {} },
  createdAt: { lte: new Date(now.getTime() - INCOMPLETE_SIGNUP_RETENTION_DAYS * DAY_MS) },
});

const countIncompleteStaffSignups = (now: Date) =>
  prisma.staff.count({ where: incompleteSignupWhere(now) });

const purgeIncompleteStaffSignups = async (now: Date, batchSize: number) => {
  const staff = await prisma.staff.findMany({
    where: incompleteSignupWhere(now),
    orderBy: { createdAt: "asc" },
    take: batchSize,
    select: { id: true },
  });

  let purged = 0;
  for (const { id } of staff) {
    const stillIncomplete = await prisma.staff.count({
      where: { id, ...incompleteSignupWhere(now) },
    });
    if (stillIncomplete === 0) continue;
    if ((await withdrawStaff(id)).ok) purged += 1;
  }

  return { purged, remaining: await countIncompleteStaffSignups(now) };
};

export { countIncompleteStaffSignups, purgeIncompleteStaffSignups };
