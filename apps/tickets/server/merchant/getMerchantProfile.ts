import "server-only";

import { prisma } from "database";
import QRCode from "qrcode";

import { toImageUrl } from "@/server/common/toImageUrl";

const guestUrl = (usersPublicUrl: string, merchantId: number) => {
  const url = new URL("/guest", usersPublicUrl);
  url.searchParams.set("merchant", String(merchantId));
  return url.toString();
};

const getMerchantProfile = async (merchantId: number, urls: { imageBaseUrl: string; usersPublicUrl: string }) => {
  const merchant = await prisma.merchant.findUniqueOrThrow({
    where: { id: merchantId },
    select: {
      id: true,
      name: true,
      address: true,
      addressDetail: true,
      postalCode: true,
      phone: true,
      photos: { select: { path: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
      booths: {
        where: { booth: { deletedAt: null } },
        select: { status: true, booth: { select: { id: true, name: true, address: true } } },
        orderBy: [{ createdAt: "asc" }, { boothId: "asc" }],
      },
    },
  });
  const qrUrl = guestUrl(urls.usersPublicUrl, merchant.id);

  return {
    name: merchant.name,
    address: merchant.address,
    addressDetail: merchant.addressDetail,
    postalCode: merchant.postalCode,
    phone: merchant.phone,
    photoUrls: merchant.photos.map(({ path }) => toImageUrl(urls.imageBaseUrl, path)),
    booths: merchant.booths.map(({ booth, status }) => ({ ...booth, status })),
    qr: {
      url: qrUrl,
      usable: merchant.booths.some(({ status }) => status === "APPROVED"),
      image: await QRCode.toDataURL(qrUrl, { width: 1024, margin: 2, errorCorrectionLevel: "M" }),
    },
  };
};

type MerchantProfile = Awaited<ReturnType<typeof getMerchantProfile>>;

export { getMerchantProfile };
export type { MerchantProfile };
