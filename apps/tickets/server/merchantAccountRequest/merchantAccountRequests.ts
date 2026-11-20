import "server-only";

import { prisma } from "database";

import type { merchantAccountRequestBodySchema } from "@/libs/merchantAccountRequest/contracts";
import type { z } from "zod";

const SEARCH_LIMIT = 20;

const searchMerchants = (query: string) =>
  prisma.merchant.findMany({
    where: {
      deletedAt: null,
      OR: [{ name: { contains: query, mode: "insensitive" } }, { address: { contains: query, mode: "insensitive" } }],
    },
    select: { id: true, name: true, address: true, category: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: SEARCH_LIMIT,
  });

const readRequestableMerchant = (merchantId: number) =>
  prisma.merchant.findFirst({
    where: { id: merchantId, deletedAt: null },
    select: { id: true, name: true, address: true, category: true },
  });

const createMerchantAccountRequest = async (input: z.output<typeof merchantAccountRequestBodySchema>) => {
  const merchant = input.merchantId === null ? null : await readRequestableMerchant(input.merchantId);
  if (input.merchantId !== null && !merchant) return "MERCHANT_NOT_FOUND" as const;

  const merchantName = merchant?.name ?? input.merchantName;
  const pending = await prisma.merchantAccountRequest.count({
    where: {
      status: "PENDING",
      requesterPhone: input.requesterPhone,
      ...(merchant ? { merchantId: merchant.id } : { merchantId: null, merchantName }),
    },
  });
  if (pending > 0) return "ALREADY_REQUESTED" as const;

  await prisma.merchantAccountRequest.create({
    data: {
      merchantId: merchant?.id ?? null,
      merchantName,
      merchantAddress: merchant?.address ?? input.merchantAddress,
      requesterName: input.requesterName,
      requesterPhone: input.requesterPhone,
    },
  });
  return "OK" as const;
};

export { createMerchantAccountRequest, readRequestableMerchant, searchMerchants };
