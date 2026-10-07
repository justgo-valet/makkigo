import { getErrorMessage } from "@makkigo/api-client";
import { useMutation } from "@tanstack/react-query";
import { useFormContext } from "react-hook-form";

import { checkPhoneNumber } from "@/features/onboarding/apis/checkPhoneNumber";
import { getOnboardingErrorCode } from "@/features/onboarding/apis/completeOnboarding";

import type { OnboardingStep } from "@/features/onboarding/onboardingSteps";
import type { OnboardingFormValues } from "@/features/onboarding/schemas/onboarding.schema";
import type { OnboardingErrorCode } from "@/libs/onboarding/contracts/onboarding";

interface DuplicateCheck {
  field: "vehicleNumber" | "phoneNumber";
  duplicateCode: OnboardingErrorCode;
  fallbackMessage: string;
  check: (value: string) => Promise<void>;
}

const DUPLICATE_CHECKS: Partial<Record<OnboardingStep, DuplicateCheck>> = {
  PHONE_NUMBER: {
    field: "phoneNumber",
    duplicateCode: "DUPLICATE_PHONE",
    fallbackMessage: "휴대폰 번호를 확인하지 못했습니다. 다시 시도해주세요.",
    check: (phoneNumber) => checkPhoneNumber({ phoneNumber }),
  },
};

const useDuplicateCheck = () => {
  const form = useFormContext<OnboardingFormValues>();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: ({ check, value }: { check: DuplicateCheck["check"]; value: string }) =>
      check(value),
  });

  // 다음 단계로 넘어가도 되면 true, 이미 등록된 값이거나 확인하지 못했으면 입력칸에 오류를 표시하고 false.
  const verify = async (step: OnboardingStep) => {
    const duplicateCheck = DUPLICATE_CHECKS[step];

    if (!duplicateCheck) return true;

    const { field, duplicateCode, fallbackMessage, check } = duplicateCheck;

    try {
      await mutateAsync({ check, value: form.getValues(field) });
      return true;
    } catch (error) {
      const message =
        getOnboardingErrorCode(error) === duplicateCode
          ? getErrorMessage(error, fallbackMessage)
          : fallbackMessage;
      form.setError(field, { message }, { shouldFocus: true });
      return false;
    }
  };

  return { verify, isChecking: isPending };
};

export { useDuplicateCheck };
