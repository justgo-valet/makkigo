import { prisma } from "database";

import { REQUIRED_CONSENT_TYPES } from "@/libs/consent/contracts/consents";

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

export { hasRequiredConsents };
