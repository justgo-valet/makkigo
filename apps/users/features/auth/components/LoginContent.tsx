"use client";

import { FieldError } from "@makkigo/ui";
import Image from "next/image";

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
  const { providers, isRedirecting, error: displayedError, login } = useSocialLogin(error);

  return (
    <div className="fixed inset-0 flex justify-center overflow-y-auto bg-(--surface-color)">
      <div className="flex flex-col w-full min-h-dvh max-w-md bg-[#0970E9]">
        <div className="flex shrink-0 flex-col items-center gap-[clamp(20px,5vh,40px)] px-6 pt-[clamp(32px,8vh,96px)]">
          <h1>
            <Image
              src="/images/brand/makkigo_logo_white.svg"
              alt="마끼고"
              width={224}
              height={91}
              priority
              className="translate-x-5"
            />
          </h1>
          <p className="text-xl font-bold tracking-tight text-white">
            주차는 <span className="text-2xl text-[#F5C518]">맡기고,</span> 편하게 가세요
          </p>
        </div>
        <div className="relative flex-1 min-h-28 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_45%)]">
          <Image
            src="/images/login/login_illustration.png"
            alt=""
            aria-hidden
            width={1488}
            height={1304}
            priority
            sizes="(max-width: 448px) 100vw, 448px"
            className="absolute bottom-0 left-0 w-full h-auto"
          />
        </div>
        <div className="relative -mt-7 flex shrink-0 flex-col gap-3 rounded-t-[28px] bg-(--surface-color) px-6 pt-[clamp(24px,4dvh,32px)] pb-[calc(clamp(24px,4dvh,32px)+env(safe-area-inset-bottom))]">
          {displayedError && (
            <FieldError className="text-center">{LOGIN_ERROR_MESSAGES[displayedError]}</FieldError>
          )}
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
    </div>
  );
}
