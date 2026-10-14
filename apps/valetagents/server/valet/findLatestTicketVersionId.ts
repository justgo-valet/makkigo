import "server-only";

import { prisma } from "database";

const findLatestTicketVersionId = async (merchantId: number) => {
  const version = await prisma.ticketVersion.findFirst({
    where: { ticket: { merchantId, deletedAt: null } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true },
  });

  return version?.id ?? null;
};

export { findLatestTicketVersionId };
