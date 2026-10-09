import { prisma } from "database";

import { createAccessToken, createRefreshToken, hashToken } from "./tokens";

export const issueUserTokens = async (userId: number, userAgent: string | null) => {
  const accessToken = await createAccessToken("users", userId);
  const refreshToken = createRefreshToken();

  await prisma.userRefreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken.token),
      userAgent: userAgent?.slice(0, 400) ?? null,
      expiresAt: refreshToken.expiresAt,
    },
  });

  return { accessToken, refreshToken };
};
