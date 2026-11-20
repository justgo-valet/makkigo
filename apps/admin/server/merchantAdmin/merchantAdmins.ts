import "server-only";

import { createTemporaryPassword, hashPassword, normalizeLoginId } from "@makkigo/auth";
import { Prisma, prisma } from "database";

import { pageArgs } from "@/server/common/pagination";

import type { MerchantAdminCreateBody } from "@/libs/merchantAdmin/contracts";

const listMerchantAdmins = async (page: number) => {
  const [merchantAdmins, total] = await prisma.$transaction([
    prisma.merchantAdmin.findMany({
      orderBy: { id: "desc" },
      ...pageArgs(page),
      select: {
        id: true,
        loginId: true,
        name: true,
        passwordChangeRequired: true,
        lockedUntil: true,
        disabledAt: true,
        createdAt: true,
        merchant: { select: { id: true, name: true, deletedAt: true } },
      },
    }),
    prisma.merchantAdmin.count(),
  ]);
  return { merchantAdmins, total };
};

const readMerchantAdmin = (merchantAdminId: number) =>
  prisma.merchantAdmin.findUnique({
    where: { id: merchantAdminId },
    select: {
      id: true,
      loginId: true,
      name: true,
      passwordChangeRequired: true,
      lockedUntil: true,
      disabledAt: true,
      createdAt: true,
      merchant: { select: { id: true, name: true, address: true, deletedAt: true } },
    },
  });

const hasMerchant = async (merchantId: number | null) =>
  merchantId === null || (await prisma.merchant.count({ where: { id: merchantId, deletedAt: null } })) === 1;

class AccountRequestNotPendingError extends Error {}

const createMerchantAdmin = async (input: MerchantAdminCreateBody) => {
  const loginId = normalizeLoginId(input.loginId);
  if (!loginId) return { ok: false as const, reason: "INVALID_LOGIN_ID" as const };
  if (!(await hasMerchant(input.merchantId))) return { ok: false as const, reason: "MERCHANT_NOT_FOUND" as const };
  const temporaryPassword = createTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  try {
    const merchantAdmin = await prisma.$transaction(async (tx) => {
      const created = await tx.merchantAdmin.create({
        data: { loginId, name: input.name, merchantId: input.merchantId, passwordHash, passwordChangeRequired: true },
        select: { id: true },
      });
      if (input.accountRequestId !== undefined) {
        const { count } = await tx.merchantAccountRequest.updateMany({
          where: { id: input.accountRequestId, status: "PENDING" },
          data: { status: "COMPLETED", merchantAdminId: created.id, processedAt: new Date() },
        });
        if (count !== 1) throw new AccountRequestNotPendingError();
      }
      return created;
    });
    return { ok: true as const, id: merchantAdmin.id, temporaryPassword };
  } catch (error) {
    if (error instanceof AccountRequestNotPendingError) {
      return { ok: false as const, reason: "REQUEST_NOT_PENDING" as const };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false as const, reason: "DUPLICATE_LOGIN_ID" as const };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return { ok: false as const, reason: "MERCHANT_NOT_FOUND" as const };
    }
    throw error;
  }
};

const linkMerchantAdmin = async (merchantAdminId: number, merchantId: number | null) => {
  if (!(await hasMerchant(merchantId))) return "MERCHANT_NOT_FOUND" as const;
  const { count } = await prisma.merchantAdmin.updateMany({ where: { id: merchantAdminId }, data: { merchantId } });
  return count === 1 ? ("OK" as const) : ("NOT_FOUND" as const);
};

const merchantAdminExists = async (merchantAdminId: number) =>
  (await prisma.merchantAdmin.count({ where: { id: merchantAdminId } })) === 1;

export { createMerchantAdmin, linkMerchantAdmin, listMerchantAdmins, merchantAdminExists, readMerchantAdmin };
