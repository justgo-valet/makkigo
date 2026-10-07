import type { ConsentType } from "@/libs/consent/contracts/consents";

interface ConsentItem {
  type: ConsentType;
  label: string;
  required: boolean;
}

const CONSENT_DOCUMENT_VERSION = "2026-10-04";

const consentItems: readonly ConsentItem[] = [
  { type: "TERMS_OF_SERVICE", label: "서비스 이용약관", required: true },
  { type: "PRIVACY_COLLECTION", label: "개인정보 수집 · 이용", required: true },
  { type: "PRIVACY_OVERSEAS_TRANSFER", label: "개인정보 국외 이전", required: true },
  { type: "APP_PUSH", label: "앱 푸시 알림 수신", required: false },
  { type: "ALIMTALK", label: "알림톡 수신", required: false },
];

export { CONSENT_DOCUMENT_VERSION, consentItems };
export type { ConsentItem };
