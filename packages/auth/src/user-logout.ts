import { prisma } from "database";

import { hashToken } from "./tokens";

export const revokeUserRefreshToken = async (refreshToken: string) => {
  await prisma.userRefreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
};
