"use client";

import { LoginScreen } from "@makkigo/ui/components/common/login/LoginScreen";
import { useEffect } from "react";

import { setAppStatusBarStyle } from "@/features/auth/appBridge";
import { useSocialLogin } from "@/features/auth/hooks/useSocialLogin";

import type { LoginError } from "@/features/auth/socialLoginProviders";

const ERROR_MESSAGES: Record<LoginError, string> = {
  cancelled: "로그인을 취소했어요.",
  failed: "로그인하지 못했어요. 다시 시도해주세요.",
};

export default function LoginContent({ error }: Readonly<{ error: LoginError | null }>) {
  const { providers, pending, error: displayedError, login } = useSocialLogin(error);

  // 파란 배경이 상태바 뒤까지 깔리므로 글자를 흰색으로.
  useEffect(() => {
    setAppStatusBarStyle("light");

    return () => setAppStatusBarStyle("dark");
  }, []);

  return (
    <LoginScreen
      providers={providers}
      disabled={pending}
      errorMessage={displayedError && ERROR_MESSAGES[displayedError]}
      onLogin={login}
    />
  );
}
