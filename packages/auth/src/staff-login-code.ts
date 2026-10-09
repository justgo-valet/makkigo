import { timingSafeEqual } from "node:crypto";

import { prisma } from "database";

import { LOGIN_CODE_TTL_SECONDS } from "./config";
import { createRandomToken, hashBase64Url, hashToken } from "./tokens";

export const createStaffLoginCode = async (staffId: number, appChallenge: string) => {
  const code = createRandomToken();
  await prisma.staffLoginCode.create({
    data: {
      staffId,
      codeHash: hashToken(code),
      appChallenge,
      expiresAt: new Date(Date.now() + LOGIN_CODE_TTL_SECONDS * 1000),
    },
  });
  return code;
};

export const consumeStaffLoginCode = async (code: string, verifier: string) => {
  const now = new Date();
  const stored = await prisma.staffLoginCode.findUnique({
    where: { codeHash: hashToken(code) },
    include: { staff: { select: { deletedAt: true } } },
  });
  if (!stored) return null;

  const expected = Buffer.from(stored.appChallenge);
  const actual = Buffer.from(hashBase64Url(verifier));
  const matches = expected.length === actual.length && timingSafeEqual(expected, actual);
  if (!matches || stored.expiresAt <= now || stored.usedAt || stored.staff.deletedAt) return null;

  const { count } = await prisma.staffLoginCode.updateMany({
    where: { id: stored.id, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  return count === 1 ? stored.staffId : null;
};
