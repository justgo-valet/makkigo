import "server-only";
import { prisma } from "database";

import { toImageUrl } from "@/server/common/imageUrl";
import { availableBoothWhere } from "@/server/merchant/availableBooth";

import type { MerchantDetail } from "@/libs/merchant/contracts/merchantDetail";

const getMerchantDetail = async (merchantId: number): Promise<MerchantDetail | null> => {
  const now = new Date();
  const merchant = await prisma.merchant.findFirst({
    where: {
      id: merchantId,
      deletedAt: null,
      booths: { some: availableBoothWhere(now) },
    },
    select: {
      id: true,
      name: true,
      address: true,
      addressDetail: true,
      latitude: true,
      longitude: true,
      photos: { select: { path: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
      booths: {
        where: availableBoothWhere(now),
        select: {
          booth: {
            select: {
              id: true,
              name: true,
              feePolicies: {
                where: { effectiveFrom: { lte: now } },
                select: {
                  baseMinutes: true,
                  baseFee: true,
                  extraUnitMinutes: true,
                  extraUnitFee: true,
                },
                orderBy: [{ effectiveFrom: "desc" }, { id: "desc" }],
                take: 1,
              },
            },
          },
        },
        orderBy: { boothId: "asc" },
      },
    },
  });

  if (!merchant) return null;

  return {
    id: merchant.id,
    name: merchant.name,
    address: merchant.address,
    addressDetail: merchant.addressDetail,
    latitude: merchant.latitude,
    longitude: merchant.longitude,
    photoUrls: merchant.photos.map((photo) => toImageUrl(photo.path)),
    booths: merchant.booths.flatMap(({ booth }) => {
      const feePolicy = booth.feePolicies[0];
      return feePolicy ? [{ id: booth.id, name: booth.name, feePolicy }] : [];
    }),
  };
};

export { getMerchantDetail };
