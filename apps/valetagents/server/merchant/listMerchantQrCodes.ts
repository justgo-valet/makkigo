import "server-only";

import { prisma } from "database";
import QRCode from "qrcode";

const guestUrl = (usersPublicUrl: string, merchantId: number) => {
  const url = new URL("/guest", usersPublicUrl);
  url.searchParams.set("merchant", String(merchantId));
  return url.toString();
};

const listMerchantQrCodes = async (staffId: number, usersPublicUrl: string) => {
  const merchants = await prisma.merchant.findMany({
    where: { adminId: staffId, deletedAt: null },
    select: {
      id: true,
      name: true,
      booths: {
        where: { status: "APPROVED", booth: { deletedAt: null } },
        select: { boothId: true },
        take: 1,
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  return Promise.all(
    merchants.map(async ({ id, name, booths }) => {
      const url = guestUrl(usersPublicUrl, id);
      return {
        id,
        name,
        url,
        usable: booths.length > 0,
        image: await QRCode.toDataURL(url, { width: 1024, margin: 2, errorCorrectionLevel: "M" }),
      };
    }),
  );
};

type MerchantQrCode = Awaited<ReturnType<typeof listMerchantQrCodes>>[number];

export { guestUrl, listMerchantQrCodes };
export type { MerchantQrCode };
