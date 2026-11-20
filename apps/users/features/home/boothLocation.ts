import type { HomeSnapshot } from "@/features/home/homeSnapshot";
import type { MerchantDetail } from "@/libs/merchant/contracts/merchantDetail";

const getBoothLocationMerchantId = ({ status, merchantId }: HomeSnapshot) =>
  status === "ARRIVAL_SCHEDULED" ? merchantId : null;

const hasBoothPhotos = (merchant: MerchantDetail | null) =>
  merchant?.booths.some((booth) => booth.photoUrls.length > 0) ?? false;

export { getBoothLocationMerchantId, hasBoothPhotos };
