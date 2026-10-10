import "server-only";
import { prisma } from "database";

import { REQUIRED_CONSENT_TYPES } from "@/libs/consent/contracts/consents";

import type { ConsentType } from "@/libs/consent/contracts/consents";

const hasRequiredConsents = async (userId: number) => {
  const latestConsents = await prisma.userConsent.findMany({
    where: { userId, type: { in: [...REQUIRED_CONSENT_TYPES] } },
    orderBy: { createdAt: "desc" },
    distinct: ["type"],
    select: { agreed: true },
  });

  return (
    latestConsents.length === REQUIRED_CONSENT_TYPES.length &&
    latestConsents.every(({ agreed }) => agreed)
  );
};

const hasAgreedToConsent = async (userId: number, type: ConsentType) => {
  const latestConsent = await prisma.userConsent.findFirst({
    where: { userId, type },
    orderBy: { createdAt: "desc" },
    select: { agreed: true },
  });

  return latestConsent?.agreed === true;
};

export { hasAgreedToConsent, hasRequiredConsents };
