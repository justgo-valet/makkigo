import { timingSafeEqual } from "node:crypto";

import { prisma } from "database";

import { LOGIN_CODE_TTL_SECONDS } from "./config";
import { createRandomToken, hashBase64Url, hashToken } from "./tokens";

export const createAppLoginVerifier = () => {
  const verifier = createRandomToken();

  return { verifier, appChallenge: hashBase64Url(verifier) };
};

export const createUserLoginCode = async (userId: number, appChallenge: string) => {
  const code = createRandomToken();

  await prisma.userLoginCode.create({
    data: {
      userId,
      codeHash: hashToken(code),
      appChallenge,
      expiresAt: new Date(Date.now() + LOGIN_CODE_TTL_SECONDS * 1000),
    },
  });

  return code;
};

export const consumeUserLoginCode = async (code: string, verifier: string) => {
  const now = new Date();
  const stored = await prisma.userLoginCode.findUnique({
    where: { codeHash: hashToken(code) },
    include: { user: { select: { deletedAt: true } } },
  });

  if (!stored) {
    return null;
  }

  const { count } = await prisma.userLoginCode.updateMany({
    where: { id: stored.id, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });

  const expected = Buffer.from(stored.appChallenge);
  const actual = Buffer.from(hashBase64Url(verifier));
  const verifierMatches = expected.length === actual.length && timingSafeEqual(expected, actual);

  return count === 1 && verifierMatches && !stored.user.deletedAt ? stored.userId : null;
};
