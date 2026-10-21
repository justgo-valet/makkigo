import { useState } from "react";

import privacyPolicy from "@/features/consent/documents/privacyPolicy";
import termsOfService from "@/features/consent/documents/termsOfService";

const LOGIN_LEGAL_DOCUMENTS = {
  TERMS_OF_SERVICE: { label: "서비스 이용약관", content: termsOfService },
  PRIVACY_POLICY: { label: "개인정보 처리방침", content: privacyPolicy },
} as const;

type LoginLegalDocumentType = keyof typeof LOGIN_LEGAL_DOCUMENTS;

const useLoginLegalDocuments = () => {
  const [openedType, setOpenedType] = useState<LoginLegalDocumentType | null>(null);

  return {
    openedDocument: openedType ? LOGIN_LEGAL_DOCUMENTS[openedType] : null,
    open: setOpenedType,
    close: () => setOpenedType(null),
  };
};

export { LOGIN_LEGAL_DOCUMENTS, useLoginLegalDocuments };
export type { LoginLegalDocumentType };
