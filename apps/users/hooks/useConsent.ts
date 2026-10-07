import { zodResolver } from "@hookform/resolvers/zod";
import { getErrorMessage } from "@makkigo/api-client";
import { useMutation } from "@tanstack/react-query";
import { useController, useForm } from "react-hook-form";

import { CONSENT_DOCUMENT_VERSION, consentItems } from "@/configs/consent/consentItems";
import { recordConsents } from "@/libs/consent/apis/recordConsents";
import { consentSchema } from "@/libs/consent/schemas/consent.schema";

import type { ConsentType } from "@/libs/consent/contracts/consents";
import type { ConsentFormValues } from "@/libs/consent/schemas/consent.schema";

const FALLBACK_ERROR_MESSAGE = "약관 동의를 저장하지 못했습니다. 다시 시도해주세요.";

const useConsent = (onAgreed: () => void) => {
  const form = useForm<ConsentFormValues>({
    resolver: zodResolver(consentSchema),
    defaultValues: { agreedTypes: [] },
  });
  const { field } = useController({ name: "agreedTypes", control: form.control });
  const {
    mutate: submitConsents,
    isPending: isSubmitting,
    error,
  } = useMutation({ mutationFn: recordConsents, onSuccess: onAgreed });
  const errorMessage = error && getErrorMessage(error, FALLBACK_ERROR_MESSAGE);

  const agreedTypes = field.value;
  const isAllChecked = agreedTypes.length === consentItems.length;
  const isRequiredChecked = form.formState.isValid;

  const toggleAll = (checked: boolean) => {
    field.onChange(checked ? consentItems.map(({ type }) => type) : []);
  };

  const toggleItem = (type: ConsentType, checked: boolean) => {
    field.onChange(
      checked ? [...agreedTypes, type] : agreedTypes.filter((agreedType) => agreedType !== type),
    );
  };

  const handleSubmit = form.handleSubmit((values) => {
    if (isSubmitting) return;

    submitConsents({
      documentVersion: CONSENT_DOCUMENT_VERSION,
      consents: consentItems.map(({ type }) => ({
        type,
        agreed: values.agreedTypes.includes(type),
      })),
    });
  });

  return {
    agreedTypes,
    isAllChecked,
    isRequiredChecked,
    isSubmitting,
    errorMessage,
    toggleAll,
    toggleItem,
    handleSubmit,
  };
};

export default useConsent;
