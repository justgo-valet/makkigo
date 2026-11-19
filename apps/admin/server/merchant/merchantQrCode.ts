import "server-only";

import QRCode from "qrcode";

export const createMerchantQrCode = async (merchantId: number) => {
  const usersPublicUrl = process.env.USERS_PUBLIC_URL?.trim();
  if (!usersPublicUrl) throw new Error("환경변수 USERS_PUBLIC_URL 이 설정되지 않았습니다.");
  const url = new URL("/guest", usersPublicUrl);
  url.searchParams.set("merchant", String(merchantId));
  return {
    url: url.toString(),
    image: await QRCode.toDataURL(url.toString(), { width: 1024, margin: 2, errorCorrectionLevel: "M" }),
  };
};
