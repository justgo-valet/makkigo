import "server-only";

import { prisma } from "database";

import type { StaffSocialAccount } from "@/libs/auth/socialAccounts";

const listStaffSocialAccounts = (staffId: number): Promise<StaffSocialAccount[]> =>
  prisma.staffSocialAccount.findMany({
    where: { staffId },
    select: { id: true, provider: true, email: true },
    orderBy: { id: "asc" },
  });

export { listStaffSocialAccounts };
