import "server-only";

import { ACTIVE_VALET_SESSION_STATUSES, Prisma, prisma } from "database";

import { pageArgs } from "@/server/common/pagination";

import type { BoothMerchantStatus } from "database";

const listBooths = async ({ query, page }: { query: string; page: number }) => {
  const where = { deletedAt: null, ...(query ? { name: { contains: query, mode: "insensitive" as const } } : {}) };
  const [booths, total] = await prisma.$transaction([
    prisma.booth.findMany({
      where,
      orderBy: { id: "desc" },
      ...pageArgs(page),
      select: {
        id: true,
        name: true,
        address: true,
        createdAt: true,
        creator: { select: { name: true } },
        _count: { select: { agents: { where: { status: "APPROVED", staff: { deletedAt: null } } } } },
      },
    }),
    prisma.booth.count({ where }),
  ]);
  const merchantCounts = await prisma.boothMerchant.groupBy({
    by: ["boothId", "status"],
    where: { boothId: { in: booths.map(({ id }) => id) }, merchant: { deletedAt: null } },
    _count: { _all: true },
  });
  const countOf = (boothId: number, status: BoothMerchantStatus) =>
    merchantCounts.find((row) => row.boothId === boothId && row.status === status)?._count._all ?? 0;
  return {
    booths: booths.map((booth) => ({
      ...booth,
      approvedMerchants: countOf(booth.id, "APPROVED"),
      pendingMerchants: countOf(booth.id, "PENDING"),
    })),
    total,
  };
};

const readBooth = (boothId: number) =>
  prisma.booth.findFirst({
    where: { id: boothId, deletedAt: null },
    select: {
      id: true,
      name: true,
      address: true,
      addressDetail: true,
      createdAt: true,
      creator: { select: { id: true, name: true, phone: true } },
      agents: {
        where: { staff: { deletedAt: null } },
        orderBy: { createdAt: "asc" },
        select: { id: true, status: true, createdAt: true, staff: { select: { id: true, name: true, phone: true } } },
      },
      merchants: {
        where: { merchant: { deletedAt: null } },
        orderBy: { createdAt: "asc" },
        select: { status: true, updatedAt: true, merchant: { select: { id: true, name: true, address: true } } },
      },
    },
  });

type BoothMerchantRequestResult =
  | "OK"
  | "MERCHANT_NOT_FOUND"
  | "BOOTH_NOT_FOUND"
  | "ALREADY_REQUESTED"
  | "ALREADY_CONNECTED";

const requestBoothMerchant = async (boothId: number, merchantId: number): Promise<BoothMerchantRequestResult> => {
  try {
    return await prisma.$transaction(async (tx): Promise<BoothMerchantRequestResult> => {
      const merchant = await tx.merchant.findFirst({ where: { id: merchantId, deletedAt: null }, select: { id: true } });
      if (!merchant) return "MERCHANT_NOT_FOUND";
      const booth = await tx.booth.findFirst({ where: { id: boothId, deletedAt: null }, select: { id: true } });
      if (!booth) return "BOOTH_NOT_FOUND";

      const contract = await tx.boothMerchant.findUnique({
        where: { boothId_merchantId: { boothId, merchantId } },
        select: { status: true },
      });
      if (!contract) {
        await tx.boothMerchant.create({ data: { boothId, merchantId, status: "PENDING" } });
        return "OK";
      }
      if (contract.status === "APPROVED") return "ALREADY_CONNECTED";
      const { count } = await tx.boothMerchant.updateMany({
        where: { boothId, merchantId, status: "REJECTED" },
        data: { status: "PENDING" },
      });
      return count === 1 ? "OK" : "ALREADY_REQUESTED";
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "ALREADY_REQUESTED";
    throw error;
  }
};

const removeBoothMerchant = (boothId: number, merchantId: number) =>
  prisma.$transaction(async (tx) => {
    const contract = await tx.boothMerchant.findUnique({
      where: { boothId_merchantId: { boothId, merchantId } },
      select: { status: true, updatedAt: true },
    });
    if (!contract || contract.status === "REJECTED") return "NOT_FOUND" as const;
    if (contract.status === "APPROVED") {
      const activeSessions = await tx.valetSession.count({
        where: {
          boothId,
          status: { in: [...ACTIVE_VALET_SESSION_STATUSES] },
          OR: [{ merchantId: null }, { merchantId }],
        },
      });
      if (activeSessions > 0) return "ACTIVE_VALET_SESSION" as const;
    }
    const { count } = await tx.boothMerchant.deleteMany({
      where: { boothId, merchantId, status: contract.status, updatedAt: contract.updatedAt },
    });
    return count === 1 ? ("OK" as const) : ("CHANGED" as const);
  });

export { listBooths, readBooth, removeBoothMerchant, requestBoothMerchant };
