import "server-only";

import { ticketDesignSchema } from "@makkigo/ticket-design";
import { Prisma, prisma } from "database";

import type { TicketDesign } from "@makkigo/ticket-design";

const latestVersion = {
  orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  take: 1,
  select: { design: true, createdAt: true },
} satisfies Prisma.Ticket$versionsArgs;

const listOwnMerchants = (staffId: number) =>
  prisma.merchant.findMany({
    where: { adminId: staffId, deletedAt: null },
    select: { id: true, name: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

const listOwnTickets = async (staffId: number) => {
  const tickets = await prisma.ticket.findMany({
    where: { deletedAt: null, merchant: { adminId: staffId, deletedAt: null } },
    select: { id: true, merchant: { select: { name: true } }, versions: latestVersion },
  });
  return tickets
    .flatMap((ticket) => {
      const version = ticket.versions[0];
      const design = ticketDesignSchema.safeParse(version?.design);
      return version && design.success
        ? [{ id: ticket.id, merchantName: ticket.merchant.name, design: design.data, updatedAt: version.createdAt }]
        : [];
    })
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime() || right.id - left.id);
};

const getOwnTicket = async (staffId: number, ticketId: number) => {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, deletedAt: null, merchant: { adminId: staffId, deletedAt: null } },
    select: { id: true, merchantId: true, merchant: { select: { name: true } }, versions: latestVersion },
  });
  const design = ticketDesignSchema.safeParse(ticket?.versions[0]?.design);
  return ticket && design.success
    ? { id: ticket.id, merchantId: ticket.merchantId, merchantName: ticket.merchant.name, design: design.data }
    : null;
};

const saveTicket = async (input: {
  staffId: number;
  merchantId?: number;
  ticketId?: number;
  design: TicketDesign;
}) =>
  prisma.$transaction(
    async (transaction) => {
      const existing = input.ticketId === undefined
        ? null
        : await transaction.ticket.findFirst({
            where: { id: input.ticketId, deletedAt: null, merchant: { adminId: input.staffId, deletedAt: null } },
            select: { id: true, merchantId: true },
          });
      if (input.ticketId !== undefined && !existing) return { kind: "NOT_FOUND" as const };
      const merchantId = existing?.merchantId ?? input.merchantId;
      if (merchantId === undefined) return { kind: "NOT_FOUND" as const };

      const merchant = await transaction.merchant.findFirst({
        where: { id: merchantId, adminId: input.staffId, deletedAt: null },
        select: { id: true },
      });
      if (!merchant) return { kind: "NOT_FOUND" as const };

      const paths = [...new Set(input.design.layers.flatMap((layer) => (layer.type === "IMAGE" ? [layer.assetPath] : [])))];
      if (paths.length > 0) {
        const assets = await transaction.ticketImageUpload.count({
          where: { merchantId, staffId: input.staffId, state: "COMPLETE", finalKey: { in: paths } },
        });
        if (assets !== paths.length) return { kind: "ASSET_NOT_FOUND" as const };
      }

      const ticket = existing ?? (await transaction.ticket.create({ data: { merchantId }, select: { id: true } }));
      await transaction.ticketVersion.create({
        data: { ticketId: ticket.id, design: input.design as Prisma.InputJsonValue },
      });
      return { kind: "SAVED" as const, ticketId: ticket.id };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

export { getOwnTicket, listOwnMerchants, listOwnTickets, saveTicket };
