import type { MenuAccess } from "@/libs/auth/menuItems";
import type { SocialProvider } from "@/libs/auth/socialAccounts";

const SOCIAL_PROVIDER_LABELS: Record<SocialProvider, { name: string; iconSrc: string }> = {
  KAKAO: { name: "카카오", iconSrc: "/images/social/kakao.svg" },
  GOOGLE: { name: "구글", iconSrc: "/images/social/google.svg" },
  APPLE: { name: "Apple", iconSrc: "/images/social/apple.png" },
};

// 처리방침 원본은 고객 앱 공개 페이지 하나다 (파트너 항목 포함). 앱 웹뷰는 다른 도메인을 시스템 브라우저로 연다.
const PRIVACY_POLICY_URL = "https://app.makkigo.com/privacy";

const getRoleLabel = ({ role, managedBoothId }: MenuAccess) => {
  if (role === "MERCHANT_ADMIN") return "업체 관리자";
  if (role === "VALET_AGENT") return managedBoothId === null ? "발렛 요원" : "부스 관리자";
  return "-";
};

export { PRIVACY_POLICY_URL, SOCIAL_PROVIDER_LABELS, getRoleLabel };
