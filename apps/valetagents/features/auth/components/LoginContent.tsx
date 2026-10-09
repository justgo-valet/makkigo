"use client";

import { Button, FieldError } from "@makkigo/ui";
import { useState, useSyncExternalStore } from "react";

import { isInApp, openAppAuthSession } from "@/features/auth/appBridge";
import { getProviders } from "@/features/auth/socialLoginProviders";

import type { LoginError, SocialLoginProvider } from "@/features/auth/socialLoginProviders";
import type { AppLoginSession } from "@/libs/auth/contracts/appLoginSession";

const BUTTONS: Record<SocialLoginProvider, { label: string; className: string; mark: string }> = {
  kakao: { label: "카카오로 계속하기", className: "bg-[#FBE200] text-[#333]", mark: "K" },
  naver: { label: "네이버로 계속하기", className: "bg-[#1BC500] text-white", mark: "N" },
  google: { label: "Google로 계속하기", className: "border border-[#D0D5DD] bg-white text-[#333]", mark: "G" },
  apple: { label: "Apple로 계속하기", className: "bg-[#101828] text-white", mark: "●" },
};

export default function LoginContent({ error }: Readonly<{ error: LoginError | null }>) {
  const userAgent = useSyncExternalStore(
    () => () => {},
    () => navigator.userAgent,
    () => "",
  );
  const providers = userAgent ? getProviders(userAgent) : [];
  const [pending, setPending] = useState(false);
  const [localError, setLocalError] = useState<LoginError | null>(error);

  const login = async (provider: SocialLoginProvider) => {
    setPending(true);
    setLocalError(null);
    if (!isInApp()) {
      window.location.assign(new URL(`/api/v1/auth/oauth/${provider}`, window.location.origin));
      return;
    }
    try {
      const response = await fetch(`/api/v1/auth/oauth/${provider}/app-session`, { method: "POST" });
      if (!response.ok) throw new Error("app session failed");
      const { authUrl, returnUrl } = (await response.json()) as AppLoginSession;
      openAppAuthSession({ url: authUrl, returnUrl });
    } catch {
      setLocalError("failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col px-2 pb-[65px]">
      <div className="fixed inset-0 -z-10 bg-[#f7f9fc]" />
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-(--primary-color)">MAKKIGO</h1>
        <p className="text-sm text-slate-500">파트너</p>
      </div>
      <div className="flex flex-col gap-3">
        {localError && <FieldError className="text-center">{localError === "cancelled" ? "로그인을 취소했어요." : "로그인하지 못했어요. 다시 시도해주세요."}</FieldError>}
        {providers.map((provider) => {
          const button = BUTTONS[provider];
          return (
            <Button key={provider} variant="ghost" disabled={pending} onClick={() => login(provider)}
              className={`h-12 w-full rounded-lg text-base font-semibold shadow-none ${button.className}`}>
              <span className="flex w-8 justify-center font-bold">{button.mark}</span>{button.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
