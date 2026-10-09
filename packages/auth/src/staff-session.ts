import { prisma } from "database";

import { verifyAccessToken } from "./tokens";

export const getActiveStaffIdFromAccessToken = async (accessToken: string) => {
  const staffId = await verifyAccessToken("valetagents", accessToken);
  if (!staffId) return null;
  const staff = await prisma.staff.findUnique({ where: { id: staffId }, select: { deletedAt: true } });
  return staff && !staff.deletedAt ? staffId : null;
};
