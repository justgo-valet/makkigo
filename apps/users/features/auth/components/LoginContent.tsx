"use client";

import { LoginScreen } from "@makkigo/ui/components/common/login/LoginScreen";

import LoginLegalNotice from "@/features/auth/components/LoginLegalNotice";
import { useAppStatusBarStyle } from "@/features/auth/hooks/useAppStatusBarStyle";
import { useHiddenHeader } from "@/features/auth/hooks/useHiddenHeader";
import { useLoginLegalDocuments } from "@/features/auth/hooks/useLoginLegalDocuments";
import { useSocialLogin } from "@/features/auth/hooks/useSocialLogin";
import { LOGIN_ERROR_MESSAGES } from "@/features/auth/socialLoginProviders";
import ConsentPanel from "@/features/consent/components/ConsentPanel";

import type { LoginError } from "@/features/auth/socialLoginProviders";

interface LoginContentProps {
  error: LoginError | null;
}

export default function LoginContent({ error }: Readonly<LoginContentProps>) {
  useHiddenHeader();
  const legalDocuments = useLoginLegalDocuments();
  // 파란 배경이 상태바 뒤까지 깔리므로 글자를 흰색으로. 흰 약관 패널이 열리면 검은색.
  useAppStatusBarStyle(legalDocuments.openedDocument ? "dark" : "light");
  const { providers, isRedirecting, error: displayedError, login } = useSocialLogin(error);

  return (
    <>
      <LoginScreen
        providers={providers}
        disabled={isRedirecting}
        errorMessage={displayedError && LOGIN_ERROR_MESSAGES[displayedError]}
        onLogin={login}
      >
        <LoginLegalNotice onOpen={legalDocuments.open} />
      </LoginScreen>
      {legalDocuments.openedDocument && (
        <ConsentPanel
          id="login-legal-panel"
          title={legalDocuments.openedDocument.label}
          content={legalDocuments.openedDocument.content}
          onClose={legalDocuments.close}
        />
      )}
    </>
  );
}
