import "server-only";

import { prisma } from "database";

import { pageArgs } from "@/server/common/pagination";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const purgeProcessedRequests = (now = Date.now()) =>
  prisma.merchantAccountRequest.deleteMany({
    where: { status: { not: "PENDING" }, processedAt: { lt: new Date(now - RETENTION_MS) } },
  });

const listMerchantAccountRequests = async (pendingOnly: boolean, page: number) => {
  await purgeProcessedRequests();
  const where = pendingOnly ? { status: "PENDING" as const } : {};
  const [requests, total] = await prisma.$transaction([
    prisma.merchantAccountRequest.findMany({
      where,
      orderBy: { id: "desc" },
      ...pageArgs(page),
      select: {
        id: true,
        merchantName: true,
        merchantAddress: true,
        requesterName: true,
        requesterPhone: true,
        status: true,
        createdAt: true,
        processedAt: true,
        merchant: { select: { id: true, name: true, address: true, deletedAt: true } },
        merchantAdmin: { select: { id: true, loginId: true } },
      },
    }),
    prisma.merchantAccountRequest.count({ where }),
  ]);
  return { requests, total };
};

const rejectMerchantAccountRequest = async (requestId: number) => {
  const { count } = await prisma.merchantAccountRequest.updateMany({
    where: { id: requestId, status: "PENDING" },
    data: { status: "REJECTED", processedAt: new Date() },
  });
  return count === 1;
};

export { listMerchantAccountRequests, rejectMerchantAccountRequest };
