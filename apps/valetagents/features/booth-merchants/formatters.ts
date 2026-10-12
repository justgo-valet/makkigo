import type { BoothMerchant } from "./schemas/merchants";

const CONTRACT_STATUS_LABELS: Record<BoothMerchant["status"], string> = {
  APPROVED: "등록",
  PENDING: "대기",
  REJECTED: "거절",
};

const SEOUL_DATE_FORMAT = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const formatRegisteredDate = ({ status, updatedAt }: Pick<BoothMerchant, "status" | "updatedAt">) =>
  status === "APPROVED" ? SEOUL_DATE_FORMAT.format(new Date(updatedAt)) : "-";

const formatMerchantAddress = ({
  address,
  addressDetail,
}: Pick<BoothMerchant, "address" | "addressDetail">) =>
  addressDetail ? `${address} ${addressDetail}` : address;

export { CONTRACT_STATUS_LABELS, formatMerchantAddress, formatRegisteredDate };
