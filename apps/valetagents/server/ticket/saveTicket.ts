import "server-only";

import { Prisma, prisma } from "database";

import { ticketDesignSchema } from "@makkigo/ticket-design";

import type { TicketDesign } from "@makkigo/ticket-design";

const saveTicket = async (input: {
  staffId: number;
  merchantId?: number;
  ticketId?: number;
  design: TicketDesign;
}) => {
  const parsed = ticketDesignSchema.safeParse(input.design);
  if (!parsed.success) return { kind: "INVALID" as const };

  return prisma.$transaction(
    async (transaction) => {
      let merchantId = input.merchantId;
      if (input.ticketId !== undefined) {
        const existing = await transaction.ticket.findFirst({
          where: {
            id: input.ticketId,
            deletedAt: null,
            merchant: { adminId: input.staffId, deletedAt: null },
          },
          select: { merchantId: true },
        });
        if (!existing) return { kind: "NOT_FOUND" as const };
        merchantId = existing.merchantId;
      }
      if (merchantId === undefined) return { kind: "INVALID" as const };

      const merchant = await transaction.merchant.findFirst({
        where: { id: merchantId, adminId: input.staffId, deletedAt: null },
        select: { id: true },
      });
      if (!merchant) return { kind: "NOT_FOUND" as const };

      const paths = [...new Set(parsed.data.layers.flatMap((layer) =>
        layer.type === "IMAGE" ? [layer.assetPath] : [],
      ))];
      if (paths.length > 0) {
        const assets = await transaction.ticketImageUpload.findMany({
          where: {
            merchantId,
            staffId: input.staffId,
            state: "COMPLETE",
            finalKey: { in: paths },
          },
          select: { finalKey: true },
        });
        if (assets.length !== paths.length) return { kind: "ASSET_NOT_FOUND" as const };
      }

      const ticket = input.ticketId === undefined
        ? await transaction.ticket.create({ data: { merchantId }, select: { id: true } })
        : { id: input.ticketId };
      await transaction.ticketVersion.create({
        data: {
          ticketId: ticket.id,
          design: parsed.data as Prisma.InputJsonValue,
        },
      });
      return { kind: "SAVED" as const, ticketId: ticket.id, merchantId };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
};

const getOwnTicketForEdit = async (staffId: number, ticketId: number) => {
  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      deletedAt: null,
      merchant: { adminId: staffId, deletedAt: null },
    },
    select: {
      id: true,
      merchantId: true,
      versions: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: { design: true },
      },
    },
  });
  if (!ticket) return null;
  const design = ticketDesignSchema.safeParse(ticket.versions[0]?.design);
  return design.success ? { id: ticket.id, merchantId: ticket.merchantId, design: design.data } : null;
};

export { getOwnTicketForEdit, saveTicket };
