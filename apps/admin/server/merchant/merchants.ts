import "server-only";

import { ACTIVE_VALET_SESSION_STATUSES, Prisma, prisma } from "database";

import { pageArgs } from "@/server/common/pagination";

import type { z } from "zod";
import type { merchantBodySchema } from "@/libs/merchant/contracts";

type MerchantInput = z.output<typeof merchantBodySchema>;

const nameFilter = (query: string) =>
  query ? { name: { contains: query, mode: "insensitive" as const } } : {};

const approvedBoothFilter = { status: "APPROVED" as const, booth: { deletedAt: null } };

const listMerchants = async ({ query, page, linkedOnly }: { query: string; page: number; linkedOnly: boolean }) => {
  const where = {
    deletedAt: null,
    ...nameFilter(query),
    ...(linkedOnly ? { booths: { some: approvedBoothFilter } } : {}),
  };
  const [merchants, total] = await prisma.$transaction([
    prisma.merchant.findMany({
      where,
      orderBy: { id: "desc" },
      ...pageArgs(page),
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        category: true,
        publicDataId: true,
        createdAt: true,
        _count: { select: { admins: { where: { disabledAt: null } } } },
        booths: { where: approvedBoothFilter, select: { boothId: true } },
      },
    }),
    prisma.merchant.count({ where }),
  ]);
  return { merchants, total };
};

const searchMerchantOptions = (query: string) =>
  prisma.merchant.findMany({
    where: { deletedAt: null, ...nameFilter(query) },
    orderBy: { name: "asc" },
    take: 20,
    select: { id: true, name: true, address: true },
  });

const readMerchant = (merchantId: number) =>
  prisma.merchant.findFirst({
    where: { id: merchantId, deletedAt: null },
    select: {
      id: true,
      name: true,
      address: true,
      addressDetail: true,
      postalCode: true,
      latitude: true,
      longitude: true,
      phone: true,
      kakaoPlaceId: true,
      createdAt: true,
      photos: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true, path: true } },
      booths: {
        where: { booth: { deletedAt: null } },
        orderBy: { createdAt: "asc" },
        select: { status: true, updatedAt: true, booth: { select: { id: true, name: true, address: true } } },
      },
      admins: {
        orderBy: { id: "asc" },
        select: { id: true, loginId: true, name: true, disabledAt: true },
      },
    },
  });

const isDuplicatePlace = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

const createMerchant = async (input: MerchantInput) => {
  try {
    const merchant = await prisma.merchant.create({ data: input, select: { id: true } });
    return { ok: true as const, id: merchant.id };
  } catch (error) {
    if (isDuplicatePlace(error)) return { ok: false as const, reason: "DUPLICATE_PLACE" as const };
    throw error;
  }
};

const updateMerchant = async (merchantId: number, input: MerchantInput) => {
  try {
    const { count } = await prisma.merchant.updateMany({ where: { id: merchantId, deletedAt: null }, data: input });
    return count === 1 ? { ok: true as const } : { ok: false as const, reason: "NOT_FOUND" as const };
  } catch (error) {
    if (isDuplicatePlace(error)) return { ok: false as const, reason: "DUPLICATE_PLACE" as const };
    throw error;
  }
};

const deleteMerchant = (merchantId: number) =>
  prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: number }[]>`
      SELECT id FROM merchants WHERE id = ${merchantId} AND deleted_at IS NULL FOR UPDATE`;
    if (locked.length === 0) return "NOT_FOUND" as const;
    const activeSessions = await tx.valetSession.count({
      where: { merchantId, status: { in: [...ACTIVE_VALET_SESSION_STATUSES] } },
    });
    if (activeSessions > 0) return "ACTIVE_VALET_SESSION" as const;
    await tx.merchant.update({ where: { id: merchantId }, data: { deletedAt: new Date(), kakaoPlaceId: null, importTargetId: null } });
    return "OK" as const;
  });

export { createMerchant, deleteMerchant, listMerchants, readMerchant, searchMerchantOptions, updateMerchant };
export type { MerchantInput };
