import "server-only";

import { prisma } from "database";

const contractedMerchantWhere = (boothId: number) => ({
  boothId,
  status: "APPROVED" as const,
  merchant: { deletedAt: null },
});

const listContractedMerchants = async (boothId: number) => {
  const contracts = await prisma.boothMerchant.findMany({
    where: contractedMerchantWhere(boothId),
    orderBy: { merchant: { name: "asc" } },
    select: { merchant: { select: { id: true, name: true } } },
  });
  return contracts.map(({ merchant }) => merchant);
};

export { contractedMerchantWhere, listContractedMerchants };
