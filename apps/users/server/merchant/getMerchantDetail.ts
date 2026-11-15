import "server-only";
import { prisma } from "database";

import { toImageUrl } from "@/server/common/imageUrl";
import { availableBoothWhere } from "@/server/merchant/availableBooth";

import type { MerchantDetail } from "@/libs/merchant/contracts/merchantDetail";

const photoOrder = [{ sortOrder: "asc" as const }, { id: "asc" as const }];

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
      photos: { select: { path: true }, orderBy: photoOrder },
      booths: {
        where: availableBoothWhere(now),
        select: {
          booth: {
            select: {
              id: true,
              name: true,
              photos: { select: { path: true }, orderBy: photoOrder },
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
      if (!feePolicy) return [];
      return [
        {
          id: booth.id,
          name: booth.name,
          photoUrls: booth.photos.map((photo) => toImageUrl(photo.path)),
          feePolicy,
        },
      ];
    }),
  };
};

export { getMerchantDetail };
