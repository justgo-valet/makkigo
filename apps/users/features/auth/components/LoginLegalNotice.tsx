import { LOGIN_LEGAL_DOCUMENTS } from "@/features/auth/hooks/useLoginLegalDocuments";

import type { LoginLegalDocumentType } from "@/features/auth/hooks/useLoginLegalDocuments";

interface LoginLegalNoticeProps {
  onOpen: (type: LoginLegalDocumentType) => void;
}

const LINK_CLASS_NAME = "underline underline-offset-2";

export default function LoginLegalNotice({ onOpen }: Readonly<LoginLegalNoticeProps>) {
  return (
    <p className="pt-1 text-center text-xs leading-5 break-keep text-(--tertiary-color)">
      로그인 전에{" "}
      <button type="button" className={LINK_CLASS_NAME} onClick={() => onOpen("TERMS_OF_SERVICE")}>
        {LOGIN_LEGAL_DOCUMENTS.TERMS_OF_SERVICE.label}
      </button>
      과{" "}
      <button type="button" className={LINK_CLASS_NAME} onClick={() => onOpen("PRIVACY_POLICY")}>
        {LOGIN_LEGAL_DOCUMENTS.PRIVACY_POLICY.label}
      </button>
      을 확인해 주세요.
    </p>
  );
}
