import { privacyPolicy } from "@makkigo/legal";

import { partnerPrivacyCollection } from "@/features/consent/documents/partnerPrivacyCollection";
import { partnerTerms } from "@/features/consent/documents/partnerTerms";

import type { MenuAccess } from "@/libs/auth/menuItems";
import type { SocialProvider } from "@/libs/auth/socialAccounts";

const SOCIAL_PROVIDER_LABELS: Record<SocialProvider, { name: string; iconSrc: string }> = {
  KAKAO: { name: "카카오", iconSrc: "/images/social/kakao.svg" },
  GOOGLE: { name: "구글", iconSrc: "/images/social/google.svg" },
  APPLE: { name: "Apple", iconSrc: "/images/social/apple.png" },
};

const TERMS_ITEMS = [
  { label: "파트너 이용약관", content: partnerTerms },
  { label: "개인정보 수집 · 이용", content: partnerPrivacyCollection },
  { label: "개인정보 처리방침", content: privacyPolicy },
] as const;

type TermsItem = (typeof TERMS_ITEMS)[number];

const getRoleLabel = ({ role, managedBoothId }: MenuAccess) => {
  if (role === "MERCHANT_ADMIN") return "업체 관리자";
  if (role === "VALET_AGENT") return managedBoothId === null ? "발렛 요원" : "부스 관리자";
  return "-";
};

export { SOCIAL_PROVIDER_LABELS, TERMS_ITEMS, getRoleLabel };
export type { TermsItem };
