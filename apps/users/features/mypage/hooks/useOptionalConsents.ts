import { getErrorMessage } from "@makkigo/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { recordConsents } from "@/features/consent/apis/recordConsents";
import { CONSENT_DOCUMENT_VERSION } from "@/features/consent/consentItems";
import { PROFILE_QUERY_KEY } from "@/features/mypage/hooks/useProfile";
import { saveRegisteredPushToken } from "@/features/push/registeredPushToken";
import { ME_QUERY_KEY } from "@/features/user/hooks/useMe";

import type { OptionalConsentItem } from "@/features/mypage/mypageItems";
import type { ProfileResponse } from "@/libs/user/contracts/profile";

const FALLBACK_ERROR_MESSAGE = "동의 설정을 바꾸지 못했습니다. 다시 시도해주세요.";

interface ConsentChange {
  item: OptionalConsentItem;
  agreed: boolean;
}

const saveConsent = async ({ item, agreed }: ConsentChange) => {
  await recordConsents({
    documentVersion: CONSENT_DOCUMENT_VERSION,
    consents: [{ type: item.type, agreed }],
  });

  if (item.type === "APP_PUSH" && !agreed) saveRegisteredPushToken(null);
};

const useOptionalConsents = (consents: ProfileResponse["consents"] | undefined) => {
  const queryClient = useQueryClient();
  const { mutate, isPending, variables, error } = useMutation({
    mutationFn: saveConsent,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
      ]),
  });

  const isChecked = (item: OptionalConsentItem) =>
    isPending && variables.item.key === item.key ? variables.agreed : Boolean(consents?.[item.key]);

  const toggle = (item: OptionalConsentItem, agreed: boolean) => {
    if (!isPending) mutate({ item, agreed });
  };

  return {
    isChecked,
    isSaving: isPending,
    errorMessage: error ? getErrorMessage(error, FALLBACK_ERROR_MESSAGE) : null,
    toggle,
  };
};

export { useOptionalConsents };
