import type { MenuAccess } from "@/libs/auth/menuItems";
import type { SocialProvider } from "@/libs/auth/socialAccounts";

const SOCIAL_PROVIDER_LABELS: Record<SocialProvider, { name: string; iconSrc: string }> = {
  KAKAO: { name: "카카오", iconSrc: "/images/social/kakao.svg" },
  GOOGLE: { name: "구글", iconSrc: "/images/social/google.svg" },
  APPLE: { name: "Apple", iconSrc: "/images/social/apple.png" },
};

const getRoleLabel = ({ role, managedBoothId }: MenuAccess) => {
  if (role === "MERCHANT_ADMIN") return "업체 관리자";
  if (role === "VALET_AGENT") return managedBoothId === null ? "발렛 요원" : "부스 관리자";
  return "-";
};

export { SOCIAL_PROVIDER_LABELS, getRoleLabel };
