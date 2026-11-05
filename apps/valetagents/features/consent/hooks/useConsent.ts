"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { CONSENT_ITEMS } from "../consentItems";
import { recordConsents } from "../apis/recordConsents";

import type { StaffConsentType } from "@/libs/consent/staffConsents";

const SAVE_ERROR_MESSAGE = "약관 동의를 저장하지 못했어요. 다시 시도해 주세요.";

const useConsent = (onAgreed: () => void) => {
  const [agreedTypes, setAgreedTypes] = useState<StaffConsentType[]>([]);
  const mutation = useMutation({ mutationFn: recordConsents, retry: false, onSuccess: onAgreed });
  const isAllChecked = agreedTypes.length === CONSENT_ITEMS.length;

  return {
    agreedTypes,
    isAllChecked,
    isSubmitting: mutation.isPending || mutation.isSuccess,
    errorMessage: mutation.error ? getErrorMessage(mutation.error, SAVE_ERROR_MESSAGE) : null,
    toggleAll: (checked: boolean) =>
      setAgreedTypes(checked ? CONSENT_ITEMS.map(({ type }) => type) : []),
    toggleItem: (type: StaffConsentType, checked: boolean) =>
      setAgreedTypes((types) =>
        checked ? [...new Set([...types, type])] : types.filter((agreed) => agreed !== type),
      ),
    submit: () => {
      if (isAllChecked && !mutation.isPending) mutation.mutate();
    },
  };
};

export { useConsent };
