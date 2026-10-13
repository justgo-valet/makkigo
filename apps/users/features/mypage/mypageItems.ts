import { consentItems } from "@/features/consent/consentItems";
import { consentDocuments } from "@/features/consent/documents";

import type { ConsentType } from "@/libs/consent/contracts/consents";
import type { ProfileResponse, SocialProvider } from "@/libs/user/contracts/profile";

type OptionalConsentKey = keyof ProfileResponse["consents"];

interface OptionalConsentItem {
  type: ConsentType;
  key: OptionalConsentKey;
  label: string;
}

const NOTIFICATION_CONSENT_ITEMS: readonly OptionalConsentItem[] = [
  { type: "APP_PUSH", key: "appPush", label: "앱 푸시 동의" },
  { type: "ALIMTALK", key: "alimtalk", label: "알림톡 동의" },
];

const LOCATION_CONSENT_ITEM: OptionalConsentItem = {
  type: "LOCATION_BASED_SERVICE",
  key: "locationBasedService",
  label: "위치기반서비스 이용 동의",
};

const TERMS_ITEMS = consentItems.flatMap(({ type, label, required }) => {
  const content = consentDocuments[type];

  return required && content ? [{ type, label, content }] : [];
});

const SOCIAL_PROVIDER_LABELS: Record<SocialProvider, { name: string; iconSrc: string }> = {
  KAKAO: { name: "카카오", iconSrc: "/images/social/kakao.svg" },
  GOOGLE: { name: "구글", iconSrc: "/images/social/google.svg" },
  APPLE: { name: "Apple", iconSrc: "/images/social/apple.png" },
  NAVER: { name: "네이버", iconSrc: "/images/social/naver.png" },
};

export { LOCATION_CONSENT_ITEM, NOTIFICATION_CONSENT_ITEMS, SOCIAL_PROVIDER_LABELS, TERMS_ITEMS };
export type { OptionalConsentItem };
