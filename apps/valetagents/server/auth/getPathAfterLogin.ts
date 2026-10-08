import "server-only";

import { prisma } from "database";

export const getPathAfterLogin = async (staffId: number) => {
  const staff = await prisma.staff.findUniqueOrThrow({
    where: { id: staffId },
    select: { role: true },
  });
  return staff.role ? "/" : "/onboarding";
};
