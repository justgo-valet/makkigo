import "server-only";

import { prisma } from "database";

import type { StaffRole } from "@/libs/onboarding/contracts/status";

const getActiveStaffRole = async (staffId: number): Promise<StaffRole | null | undefined> => {
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, deletedAt: null },
    select: { role: true },
  });

  return staff?.role;
};

export { getActiveStaffRole };
