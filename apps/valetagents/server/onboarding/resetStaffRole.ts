import "server-only";

import { prisma } from "database";

const resetStaffRole = async (staffId: number) => {
  const { count } = await prisma.staff.updateMany({
    where: {
      id: staffId,
      deletedAt: null,
      role: { not: null },
      boothMemberships: { none: { booth: { deletedAt: null } } },
      merchants: { none: { deletedAt: null } },
    },
    data: { role: null },
  });

  return count > 0;
};

export { resetStaffRole };
