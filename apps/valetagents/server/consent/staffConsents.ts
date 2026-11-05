import "server-only";

import { prisma } from "database";

import { PARTNER_DOCUMENT_VERSION, STAFF_CONSENT_TYPES } from "@/libs/consent/staffConsents";

const hasStaffConsents = async (staffId: number) => {
  const consents = await prisma.staffConsent.findMany({
    where: { staffId, type: { in: [...STAFF_CONSENT_TYPES] } },
    distinct: ["type"],
    select: { type: true },
  });

  return consents.length === STAFF_CONSENT_TYPES.length;
};

const recordStaffConsents = async (staffId: number) => {
  await prisma.staffConsent.createMany({
    data: STAFF_CONSENT_TYPES.map((type) => ({
      staffId,
      type,
      documentVersion: PARTNER_DOCUMENT_VERSION,
    })),
  });
};

export { hasStaffConsents, recordStaffConsents };
