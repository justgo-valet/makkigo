import { consentItems } from "@/features/consent/consentItems";
import { consentDocuments } from "@/features/consent/documents";
import privacyPolicy from "@/features/consent/documents/privacyPolicy";

import type { ConsentType } from "@/libs/consent/contracts/consents";
import type { ProfileResponse, SocialProvider } from "@/libs/user/contracts/profile";

type OptionalConsentKey = keyof ProfileResponse["consents"];

interface OptionalConsentItem {
  type: ConsentType;
  key: OptionalConsentKey;
  label: string;
}

const LOCATION_CONSENT_ITEM: OptionalConsentItem = {
  type: "LOCATION_BASED_SERVICE",
  key: "locationBasedService",
  label: "위치기반서비스 이용 동의",
};

type TermsItemType = ConsentType | "PRIVACY_POLICY";

interface TermsItem {
  type: TermsItemType;
  label: string;
  content: string;
}

const TERMS_ITEMS: TermsItem[] = [
  ...consentItems.flatMap(({ type, label, required }) => {
    const content = consentDocuments[type];

    return required && content ? [{ type, label, content }] : [];
  }),
  { type: "PRIVACY_POLICY", label: "개인정보 처리방침", content: privacyPolicy },
];

const SOCIAL_PROVIDER_LABELS: Record<SocialProvider, { name: string; iconSrc: string }> = {
  KAKAO: { name: "카카오", iconSrc: "/images/social/kakao.svg" },
  GOOGLE: { name: "구글", iconSrc: "/images/social/google.svg" },
  APPLE: { name: "Apple", iconSrc: "/images/social/apple.png" },
};

export { LOCATION_CONSENT_ITEM, SOCIAL_PROVIDER_LABELS, TERMS_ITEMS };
export type { OptionalConsentItem, TermsItemType };
