import { privacyPolicy } from "@makkigo/legal";

import privacyThirdParty from "@/features/consent/documents/privacyThirdParty";
import termsOfService from "@/features/consent/documents/termsOfService";

const GUEST_LEGAL_DOCUMENTS = {
  TERMS_OF_SERVICE: { label: "서비스 이용약관", content: termsOfService },
  PRIVACY_THIRD_PARTY: { label: "개인정보 제3자 제공", content: privacyThirdParty },
  PRIVACY_POLICY: { label: "개인정보 처리방침", content: privacyPolicy },
} as const;

type GuestLegalDocumentType = keyof typeof GUEST_LEGAL_DOCUMENTS;

export { GUEST_LEGAL_DOCUMENTS };
export type { GuestLegalDocumentType };
