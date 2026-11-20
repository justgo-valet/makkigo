import "server-only";

import { prisma } from "database";

export const updateStaffName = async (staffId: number, name: string) => {
  const { count } = await prisma.staff.updateMany({ where: { id: staffId, deletedAt: null }, data: { name } });
  return count === 1;
};
