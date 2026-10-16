import { getErrorMessage } from "@makkigo/api-client";
import { useState, useSyncExternalStore } from "react";

import { isInApp, openAppNotificationSettings } from "@/features/auth/appBridge";
import { formatVehicleNumber } from "@/features/home/homeFormat";
import { useLogout } from "@/features/mypage/hooks/useLogout";
import { useMypageHeader } from "@/features/mypage/hooks/useMypageHeader";
import { useNumberEdit } from "@/features/mypage/hooks/useNumberEdit";
import { useOptionalConsents } from "@/features/mypage/hooks/useOptionalConsents";
import { useProfile } from "@/features/mypage/hooks/useProfile";
import { useWithdraw } from "@/features/mypage/hooks/useWithdraw";
import { SOCIAL_PROVIDER_LABELS, TERMS_ITEMS } from "@/features/mypage/mypageItems";
import { usePushPermissionBanner } from "@/features/push/hooks/usePushPermissionBanner";
import { formatPhoneNumber } from "@/libs/common/format/phoneNumber";

import type { TermsItemType } from "@/features/mypage/mypageItems";

const FALLBACK_ERROR_MESSAGE = "내 정보를 불러오지 못했습니다.";

const subscribeNothing = () => () => {};

const useMypage = () => {
  useMypageHeader();
  const { data: profile, error, isPending, isError, refetch } = useProfile();
  const vehicleNumberEdit = useNumberEdit("vehicleNumber", profile?.plateNumber ?? null);
  const phoneNumberEdit = useNumberEdit("phoneNumber", profile?.phoneNumber ?? null);
  const consents = useOptionalConsents(profile?.consents);
  const logout = useLogout();
  const withdraw = useWithdraw();
  const pushPermissionBanner = usePushPermissionBanner();
  const [openedTermsType, setOpenedTermsType] = useState<TermsItemType | null>(null);
  const canOpenNotificationSettings = useSyncExternalStore(subscribeNothing, isInApp, () => false);

  const openedTerms = TERMS_ITEMS.find(({ type }) => type === openedTermsType) ?? null;

  const socialAccounts = (profile?.socialAccounts ?? []).map(({ provider, email }) => {
    const { name, iconSrc } = SOCIAL_PROVIDER_LABELS[provider];

    return { key: `${provider}-${email ?? ""}`, name, iconSrc, text: email ?? `${name} 계정` };
  });

  return {
    status: isPending ? "loading" : isError ? "error" : "ready",
    errorMessage: isError ? getErrorMessage(error, FALLBACK_ERROR_MESSAGE) : null,
    retry: () => void refetch(),
    plateNumberText: profile?.plateNumber ? formatVehicleNumber(profile.plateNumber) : "",
    phoneNumberText: profile?.phoneNumber ? formatPhoneNumber(profile.phoneNumber) : "",
    socialAccounts,
    vehicleNumberEdit,
    phoneNumberEdit,
    consents,
    termsItems: TERMS_ITEMS,
    openedTerms,
    openTerms: setOpenedTermsType,
    closeTerms: () => setOpenedTermsType(null),
    logout,
    withdraw,
    pushPermissionBanner,
    notificationSettings: {
      isAvailable: canOpenNotificationSettings,
      open: openAppNotificationSettings,
    },
  } as const;
};

export { useMypage };
