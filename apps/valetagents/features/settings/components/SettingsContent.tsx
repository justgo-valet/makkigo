"use client";

import { Button, FieldError } from "@makkigo/ui";
import Image from "next/image";
import { useSyncExternalStore } from "react";

import AppHeader from "@/components/layouts/AppHeader";
import { isInApp, openAppNotificationSettings } from "@/features/auth/appBridge";
import { useLogout } from "@/features/auth/hooks/useLogout";

import { SOCIAL_PROVIDER_LABELS, getRoleLabel } from "../settingsItems";
import SettingsRow from "./SettingsRow";
import SettingsSection from "./SettingsSection";

import type { MenuAccess } from "@/libs/auth/menuItems";
import type { StaffSocialAccount } from "@/libs/auth/socialAccounts";

interface SettingsContentProps {
  staffId: number;
  menu: MenuAccess;
  socialAccounts: StaffSocialAccount[];
}

const subscribeNothing = () => () => {};

export default function SettingsContent({
  staffId,
  menu,
  socialAccounts,
}: Readonly<SettingsContentProps>) {
  const logout = useLogout(staffId);
  const canOpenNotificationSettings = useSyncExternalStore(subscribeNothing, isInApp, () => false);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
      <AppHeader menu={menu} backHref="/" />

      <h1 className="mt-4 text-xl font-bold text-(--base-color)">설정</h1>

      <div className="mt-6 flex flex-col gap-6 pb-6">
        <SettingsSection title="내 정보">
          <SettingsRow>
            <span className="shrink-0">역할</span>
            <span className="truncate text-sm text-(--tertiary-color)">{getRoleLabel(menu)}</span>
          </SettingsRow>
          {socialAccounts.map(({ id, provider, email }) => {
            const { name, iconSrc } = SOCIAL_PROVIDER_LABELS[provider];

            return (
              <SettingsRow key={id}>
                <span className="shrink-0">연동 계정</span>
                <span className="flex min-w-0 items-center gap-2 text-sm text-(--tertiary-color)">
                  <Image
                    src={iconSrc}
                    alt={name}
                    width={19}
                    height={19}
                    className="size-[19px] shrink-0 rounded-full object-contain"
                  />
                  <span className="truncate">{email ?? `${name} 계정`}</span>
                </span>
              </SettingsRow>
            );
          })}
        </SettingsSection>

        {canOpenNotificationSettings && (
          <SettingsSection title="알림 설정">
            <SettingsRow>
              <span className="min-w-0 flex-1">앱 알림</span>
              <Button
                type="button"
                variant="ghost"
                className="h-auto shrink-0 px-1 py-0.5 text-sm font-normal text-(--primary-color) hover:bg-transparent"
                aria-label="휴대폰 알림 설정 열기"
                onClick={openAppNotificationSettings}
              >
                설정 열기
              </Button>
            </SettingsRow>
          </SettingsSection>
        )}

        <div className="flex flex-col gap-3">
          {logout.errorMessage && <FieldError>{logout.errorMessage}</FieldError>}
          <Button
            type="button"
            variant="outline"
            size="xl"
            className="w-full rounded-xl text-[15px] font-semibold text-(--base-color) shadow-xs"
            disabled={logout.isLoggingOut}
            onClick={logout.logout}
          >
            {logout.isLoggingOut ? "로그아웃하는 중…" : "로그아웃"}
          </Button>
        </div>
      </div>
    </div>
  );
}
