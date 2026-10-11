"use client";

import { LoginScreen } from "@makkigo/ui/components/common/login/LoginScreen";

import { useHiddenHeader } from "@/features/auth/hooks/useHiddenHeader";
import { useSocialLogin } from "@/features/auth/hooks/useSocialLogin";
import { LOGIN_ERROR_MESSAGES } from "@/features/auth/socialLoginProviders";

import type { LoginError } from "@/features/auth/socialLoginProviders";

interface LoginContentProps {
  error: LoginError | null;
}

export default function LoginContent({ error }: Readonly<LoginContentProps>) {
  useHiddenHeader();
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
