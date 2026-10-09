import { prisma } from "database";

import { hashToken } from "./tokens";

export const revokeStaffRefreshToken = async (refreshToken: string) => {
  await prisma.staffRefreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
};
