"use client";

import { FieldError } from "@makkigo/ui";

import SocialLoginButton from "@/features/auth/components/SocialLoginButton";
import { useHiddenHeader } from "@/features/auth/hooks/useHiddenHeader";
import { useSocialLogin } from "@/features/auth/hooks/useSocialLogin";
import { LOGIN_ERROR_MESSAGES } from "@/features/auth/socialLoginProviders";

import type { LoginError } from "@/features/auth/socialLoginProviders";

interface LoginContentProps {
  error: LoginError | null;
}

export default function LoginContent({ error }: Readonly<LoginContentProps>) {
  useHiddenHeader();
  const { providers, isRedirecting, login } = useSocialLogin();

  return (
    <div className="flex flex-col w-full h-full max-w-md px-2 pb-[65px] mx-auto">
      <div className="fixed inset-0 -z-10 bg-(--surface-color)" />
      <div className="flex items-center justify-center flex-1">
        {/* TODO: 로고 확정 시 변경 */}
        <h1 className="text-3xl font-bold tracking-tight text-(--primary-color)">MAKKIGO</h1>
      </div>
      <div className="flex flex-col gap-3">
        {error && <FieldError className="text-center">{LOGIN_ERROR_MESSAGES[error]}</FieldError>}
        {providers.map((provider) => (
          <SocialLoginButton
            key={provider}
            provider={provider}
            disabled={isRedirecting}
            onClick={() => login(provider)}
          />
        ))}
      </div>
    </div>
  );
}
