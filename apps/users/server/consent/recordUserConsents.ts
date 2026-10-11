import "server-only";
import { prisma } from "database";

import type { RecordConsentsRequest } from "@/libs/consent/contracts/consents";

const recordUserConsents = async (userId: number, request: RecordConsentsRequest) => {
  const withdrawsLocation = request.consents.some(
    ({ type, agreed }) => type === "LOCATION_BASED_SERVICE" && !agreed,
  );
  const withdrawsAppPush = request.consents.some(
    ({ type, agreed }) => type === "APP_PUSH" && !agreed,
  );

  await prisma.$transaction([
    prisma.userConsent.createMany({
      data: request.consents.map(({ type, agreed }) => ({
        userId,
        type,
        agreed,
        documentVersion: request.documentVersion,
      })),
    }),
    ...(withdrawsLocation ? [prisma.locationUseLog.deleteMany({ where: { userId } })] : []),
    ...(withdrawsAppPush ? [prisma.pushDevice.deleteMany({ where: { userId } })] : []),
  ]);
};

export { recordUserConsents };
