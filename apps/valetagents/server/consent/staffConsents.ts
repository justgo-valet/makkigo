import "server-only";

import { prisma } from "database";

import { PARTNER_DOCUMENT_VERSION, STAFF_CONSENT_TYPES } from "@/libs/consent/staffConsents";

const recordStaffConsents = async (staffId: number) => {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.staffConsent.findMany({
      where: { staffId, documentVersion: PARTNER_DOCUMENT_VERSION },
      select: { type: true },
    });
    const recorded = new Set(existing.map(({ type }) => type));
    await tx.staffConsent.createMany({
      data: STAFF_CONSENT_TYPES.filter((type) => !recorded.has(type)).map((type) => ({
        staffId,
        type,
        documentVersion: PARTNER_DOCUMENT_VERSION,
      })),
    });
    await tx.staff.updateMany({
      where: { id: staffId, role: null, deletedAt: null },
      data: { role: "VALET_AGENT" },
    });
  });
};

export { recordStaffConsents };
