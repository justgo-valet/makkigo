"use client";

import { SocialLoginButton } from "@makkigo/ui/components/common/login/SocialLoginButton";
import { FieldError } from "@makkigo/ui";
import { makkigoLogo } from "@makkigo/ui/assets";
import Image from "next/image";
import { useEffect, useState } from "react";

const PROVIDERS = ["kakao", "google", "apple"] as const;
const ERROR_MESSAGES = {
  cancelled: "로그인을 취소했어요.",
  failed: "로그인하지 못했어요. 다시 시도해 주세요.",
  role: "업체 관리자 계정만 티켓을 관리할 수 있어요. 요원 앱에서 업체 관리자로 가입해 주세요.",
} as const;

type LoginError = keyof typeof ERROR_MESSAGES;

export default function LoginCard({ error }: Readonly<{ error: LoginError | null }>) {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-[0_8px_32px_rgba(3,9,15,0.08)]">
      <Image src={makkigoLogo} alt="마끼고" width={132} height={54} priority />
      <h1 className="mt-6 text-2xl font-bold tracking-tight">티켓 관리</h1>
      <p className="mt-2 text-sm leading-relaxed text-(--tertiary-color)">
        고객 앱에 보이는 발렛 티켓을 넓은 화면에서 꾸며 보세요. 요원 앱의 업체 관리자 계정으로 로그인합니다.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        {error && <FieldError className="text-center">{ERROR_MESSAGES[error]}</FieldError>}
        {PROVIDERS.map((provider) => (
          <SocialLoginButton
            key={provider}
            provider={provider}
            disabled={pending}
            onClick={() => {
              setPending(true);
              window.location.assign(new URL(`/api/v1/auth/oauth/${provider}`, window.location.origin));
            }}
          />
        ))}
      </div>
    </div>
  );
}

export type { LoginError };
