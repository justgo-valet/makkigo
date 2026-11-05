import { partnerPrivacyCollection } from "./documents/partnerPrivacyCollection";
import { partnerTerms } from "./documents/partnerTerms";

import type { StaffConsentType } from "@/libs/consent/staffConsents";

const CONSENT_ITEMS: readonly { type: StaffConsentType; label: string; content: string }[] = [
  { type: "PARTNER_TERMS", label: "파트너 이용약관", content: partnerTerms },
  {
    type: "PARTNER_PRIVACY_COLLECTION",
    label: "개인정보 수집 · 이용",
    content: partnerPrivacyCollection,
  },
];

export { CONSENT_ITEMS };
