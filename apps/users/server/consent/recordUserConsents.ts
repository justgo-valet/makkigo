import "server-only";
import { prisma } from "database";

import type { RecordConsentsRequest } from "@/libs/consent/contracts/consents";

const recordUserConsents = async (userId: number, request: RecordConsentsRequest) => {
  await prisma.userConsent.createMany({
    data: request.consents.map(({ type, agreed }) => ({
      userId,
      type,
      agreed,
      documentVersion: request.documentVersion,
    })),
  });
};

export { recordUserConsents };
