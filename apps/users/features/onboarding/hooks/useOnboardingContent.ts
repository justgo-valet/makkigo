import { useState } from "react";
import { useFormContext } from "react-hook-form";

import { useDuplicateCheck } from "@/features/onboarding/hooks/useDuplicateCheck";
import { useOnboarding } from "@/features/onboarding/hooks/useOnboarding";
import { useOnboardingSubmit } from "@/features/onboarding/hooks/useOnboardingSubmit";
import { onboardingFlow } from "@/features/onboarding/onboardingFlow";
import { useMe } from "@/features/user/hooks/useMe";

import type { OnboardingFormValues } from "@/features/onboarding/schemas/onboarding.schema";
import type { FormEvent } from "react";

const useOnboardingContent = () => {
  const { onboardingStep, buttonType, handleMoveNextStep, handleMoveToStep } = useOnboarding();
  const form = useFormContext<OnboardingFormValues>();
  const { data: me } = useMe();
  const [hasAgreedConsents, setHasAgreedConsents] = useState(me?.requiredConsentsAgreed ?? false);
  const { verify: verifyNotDuplicated, isChecking } = useDuplicateCheck();
  const {
    submit,
    isSubmitting,
    errorMessage: submitErrorMessage,
  } = useOnboardingSubmit({
    onCompleted: handleMoveNextStep,
    onMoveToStep: handleMoveToStep,
    onConsentsMissing: () => setHasAgreedConsents(false),
  });
  const step = onboardingFlow[onboardingStep];
  const isBusy = isSubmitting || isChecking;
  const isSubmitStep = buttonType === "SUBMIT";

  // 현재 단계 입력 검증 → (마지막 단계면 저장, 아니면 중복 확인 후 다음 단계)
  const goForward = async () => {
    if (isBusy) return;

    const isValid = await form.trigger(step.fields, { shouldFocus: true });

    if (!isValid) return;

    if (isSubmitStep) {
      submit();
      return;
    }

    if (!(await verifyNotDuplicated(onboardingStep))) return;

    handleMoveNextStep();
  };

  return {
    StepComponent: step.component,
    isSubmitStep,
    isBusy,
    submitErrorMessage: isSubmitStep ? submitErrorMessage : null,
    isConsentSheetOpen: !hasAgreedConsents,
    handleConsentsAgreed: () => setHasAgreedConsents(true),
    handleSubmit: (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void goForward();
    },
  };
};

export { useOnboardingContent };
