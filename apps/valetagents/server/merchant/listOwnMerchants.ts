import "server-only";

import { prisma } from "database";

import type { OwnedMerchantListResponse } from "@/libs/merchant/contracts/merchants";

const toImageUrl = (baseUrl: string, path: string) => {
  const normalizedBaseUrl = new URL(baseUrl);
  const base = normalizedBaseUrl.toString().replace(/\/$/, "");
  return `${base}/${path.replace(/^\/+/, "")}`;
};

const listOwnMerchants = async (
  staffId: number,
  imageBaseUrl: string,
): Promise<OwnedMerchantListResponse> => {
  const merchants = await prisma.merchant.findMany({
    where: { adminId: staffId, deletedAt: null },
    select: {
      id: true,
      name: true,
      address: true,
      addressDetail: true,
      postalCode: true,
      latitude: true,
      longitude: true,
      photos: {
        select: { path: true },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      },
      booths: {
        where: { booth: { deletedAt: null } },
        select: {
          status: true,
          booth: { select: { id: true, name: true, address: true } },
        },
        orderBy: [{ createdAt: "asc" }, { boothId: "asc" }],
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  return {
    items: merchants.map((merchant) => ({
      id: merchant.id,
      name: merchant.name,
      address: merchant.address,
      addressDetail: merchant.addressDetail,
      postalCode: merchant.postalCode,
      latitude: merchant.latitude,
      longitude: merchant.longitude,
      photoUrls: merchant.photos.map(({ path }) => toImageUrl(imageBaseUrl, path)),
      booths: merchant.booths.map(({ booth, status }) => ({ ...booth, status })),
    })),
  };
};

export { listOwnMerchants, toImageUrl };
