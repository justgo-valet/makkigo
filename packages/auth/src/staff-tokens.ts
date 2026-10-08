import { Prisma, prisma } from "database";

import { createAccessToken, createRefreshToken, hashToken } from "./tokens";

export const issueStaffTokens = async (
  staffId: number,
  userAgent: string | null,
  client: Prisma.TransactionClient | typeof prisma = prisma,
) => {
  const accessToken = await createAccessToken("valetagents", staffId);
  const refreshToken = createRefreshToken();
  await client.staffRefreshToken.create({
    data: {
      staffId,
      tokenHash: hashToken(refreshToken.token),
      userAgent: userAgent?.slice(0, 400) ?? null,
      expiresAt: refreshToken.expiresAt,
    },
  });
  return { accessToken, refreshToken };
};
