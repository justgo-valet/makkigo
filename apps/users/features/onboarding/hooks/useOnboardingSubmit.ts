import { getErrorMessage } from "@makkigo/api-client";
import { useMutation } from "@tanstack/react-query";
import { useFormContext } from "react-hook-form";

import {
  completeOnboarding,
  getOnboardingErrorCode,
} from "@/features/onboarding/apis/completeOnboarding";

import type { OnboardingStep } from "@/features/onboarding/onboardingSteps";
import type { OnboardingFormValues } from "@/features/onboarding/schemas/onboarding.schema";

const FALLBACK_ERROR_MESSAGE = "정보를 저장하지 못했습니다. 다시 시도해주세요.";

interface UseOnboardingSubmitOptions {
  onCompleted: () => void;
  onMoveToStep: (step: OnboardingStep) => void;
  onConsentsMissing: () => void;
}

const useOnboardingSubmit = ({
  onCompleted,
  onMoveToStep,
  onConsentsMissing,
}: UseOnboardingSubmitOptions) => {
  const form = useFormContext<OnboardingFormValues>();
  const { mutate, isPending, error } = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: onCompleted,
    onError: (submitError) => {
      const message = getErrorMessage(submitError, FALLBACK_ERROR_MESSAGE);

      switch (getOnboardingErrorCode(submitError)) {
        case "DUPLICATE_VEHICLE":
          onMoveToStep("CAR_NUMBER");
          form.setError("vehicleNumber", { message });
          break;
        case "DUPLICATE_PHONE":
          onMoveToStep("PHONE_NUMBER");
          form.setError("phoneNumber", { message });
          break;
        case "REQUIRED_CONSENTS_MISSING":
          onConsentsMissing();
          break;
        case "ALREADY_COMPLETED":
          onCompleted();
          break;
      }
    },
  });

  // 에러 코드로 처리되지 않은 실패만 버튼 위에 메시지로 보여준다.
  const errorMessage =
    error && getOnboardingErrorCode(error) === null
      ? getErrorMessage(error, FALLBACK_ERROR_MESSAGE)
      : null;

  return {
    submit: () => mutate(form.getValues()),
    isSubmitting: isPending,
    errorMessage,
  };
};

export { useOnboardingSubmit };
