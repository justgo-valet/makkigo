import "server-only";

import { prisma } from "database";

import { BOOTH_MERCHANT_PAGE_SIZE } from "@/libs/booth/contracts/booth-merchants";
import { toImageUrl } from "@/server/merchant/listOwnMerchants";

import { getBoothManagerFailure } from "./boothManager";

import type { BoothManagerFailure } from "./boothManager";
import type { BoothMerchantListResponse } from "@/libs/booth/contracts/booth-merchants";

type ListBoothMerchantsResult =
  | { ok: true; value: BoothMerchantListResponse }
  | { ok: false; reason: BoothManagerFailure };

const listBoothMerchants = async (
  staffId: number,
  boothId: number,
  page: number,
  imageBaseUrl: string,
): Promise<ListBoothMerchantsResult> => {
  const failure = await getBoothManagerFailure(staffId, boothId);
  if (failure) return { ok: false, reason: failure };

  const where = { boothId, merchant: { deletedAt: null } };
  const [total, contracts] = await Promise.all([
    prisma.boothMerchant.count({ where }),
    prisma.boothMerchant.findMany({
      where,
      orderBy: [{ createdAt: "asc" }, { merchantId: "asc" }],
      skip: (page - 1) * BOOTH_MERCHANT_PAGE_SIZE,
      take: BOOTH_MERCHANT_PAGE_SIZE,
      select: {
        merchantId: true,
        status: true,
        updatedAt: true,
        merchant: {
          select: {
            name: true,
            address: true,
            addressDetail: true,
            photos: { select: { path: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
          },
        },
      },
    }),
  ]);

  return {
    ok: true,
    value: {
      items: contracts.map((contract) => ({
        id: contract.merchantId,
        name: contract.merchant.name,
        address: contract.merchant.address,
        addressDetail: contract.merchant.addressDetail,
        photoUrls: contract.merchant.photos.map(({ path }) => toImageUrl(imageBaseUrl, path)),
        status: contract.status,
        updatedAt: contract.updatedAt.toISOString(),
      })),
      page,
      totalPages: Math.max(1, Math.ceil(total / BOOTH_MERCHANT_PAGE_SIZE)),
    },
  };
};

export { listBoothMerchants };
