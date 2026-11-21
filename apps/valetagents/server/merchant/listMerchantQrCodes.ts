import "server-only";

import QRCode from "qrcode";

import { getBoothAgentFailure } from "@/server/booth/boothAgent";
import { listContractedMerchants } from "@/server/booth/listContractedMerchants";

const guestUrl = (merchantId: number) => {
  const usersPublicUrl = process.env.USERS_PUBLIC_URL?.trim();
  if (!usersPublicUrl) throw new Error("환경변수 USERS_PUBLIC_URL 이 설정되지 않았습니다.");
  const url = new URL("/guest", usersPublicUrl);
  url.searchParams.set("merchant", String(merchantId));
  return url.toString();
};

const listMerchantQrCodes = async (staffId: number, boothId: number) => {
  const failure = await getBoothAgentFailure(staffId, boothId);
  if (failure) return { ok: false as const, reason: failure };

  const merchants = await listContractedMerchants(boothId);
  return {
    ok: true as const,
    value: await Promise.all(
      merchants.map(async ({ id, name }) => ({
        id,
        name,
        image: await QRCode.toDataURL(guestUrl(id), { width: 512, margin: 2, errorCorrectionLevel: "M" }),
      })),
    ),
  };
};

export { listMerchantQrCodes };
