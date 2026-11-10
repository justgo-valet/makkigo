import type { Prisma } from "../generated/prisma/client";

export const findLatestTicketVersionId = async (
  db: Pick<Prisma.TransactionClient, "ticketVersion">,
  merchantId: number,
) => {
  const version = await db.ticketVersion.findFirst({
    where: { ticket: { merchantId, deletedAt: null } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true },
  });

  return version?.id ?? null;
};
