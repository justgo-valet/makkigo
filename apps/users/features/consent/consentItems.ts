import { isRequiredConsent } from "@/libs/consent/contracts/consents";

import type { ConsentType } from "@/libs/consent/contracts/consents";

interface ConsentItem {
  type: ConsentType;
  label: string;
  required: boolean;
}

const CONSENT_DOCUMENT_VERSION = "2026-10-31";

// 필수 여부는 서버와 같은 기준(REQUIRED_CONSENT_TYPES)에서 가져온다.
const consentItems: readonly ConsentItem[] = (
  [
    { type: "AGE_14_OR_OVER", label: "만 14세 이상입니다" },
    { type: "TERMS_OF_SERVICE", label: "서비스 이용약관" },
    { type: "PRIVACY_COLLECTION", label: "개인정보 수집 · 이용" },
    { type: "PRIVACY_THIRD_PARTY", label: "개인정보 제3자 제공" },
    { type: "APP_PUSH", label: "앱 푸시 알림 수신" },
    { type: "ALIMTALK", label: "알림톡 수신" },
  ] as const
).map((item) => ({ ...item, required: isRequiredConsent(item.type) }));

export { CONSENT_DOCUMENT_VERSION, consentItems };
export type { ConsentItem };
