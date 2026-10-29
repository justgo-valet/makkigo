"use client";

import { LoginScreen } from "@makkigo/ui/components/common/login/LoginScreen";

import { useAppStatusBarStyle } from "@/features/auth/hooks/useAppStatusBarStyle";
import { useHiddenHeader } from "@/features/auth/hooks/useHiddenHeader";
import { useSocialLogin } from "@/features/auth/hooks/useSocialLogin";
import { LOGIN_ERROR_MESSAGES } from "@/features/auth/socialLoginProviders";

import type { LoginError } from "@/features/auth/socialLoginProviders";

interface LoginContentProps {
  error: LoginError | null;
}

export default function LoginContent({ error }: Readonly<LoginContentProps>) {
  useHiddenHeader();
  // 파란 배경이 상태바 뒤까지 깔리므로 글자를 흰색으로.
  useAppStatusBarStyle("light");
  const { providers, isRedirecting, error: displayedError, login } = useSocialLogin(error);

  return (
    <LoginScreen
      providers={providers}
      disabled={isRedirecting}
      errorMessage={displayedError && LOGIN_ERROR_MESSAGES[displayedError]}
      onLogin={login}
    />
  );
}
