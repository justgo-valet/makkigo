import { prisma } from "database";

import { verifyAccessToken } from "./tokens";

export const getActiveUserIdFromAccessToken = async (accessToken: string) => {
  const userId = await verifyAccessToken("users", accessToken);

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { deletedAt: true } });

  return user && !user.deletedAt ? userId : null;
};
