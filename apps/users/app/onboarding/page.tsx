"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { Button, FieldError } from "@makkigo/ui";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

import ConsentSheet from "@/features/consent/components/ConsentSheet";
import {
  completeOnboarding,
  getOnboardingErrorCode,
} from "@/features/onboarding/apis/completeOnboarding";
import AnimatedOnboarding from "@/features/onboarding/components/AnimatedOnboarding";
import { useOnboarding } from "@/features/onboarding/hooks/useOnboarding";
import { onboardingFlow } from "@/features/onboarding/onboardingFlow";
import { useMe } from "@/features/user/hooks/useMe";

import type { OnboardingFormValues } from "@/features/onboarding/schemas/onboarding.schema";

const FALLBACK_ERROR_MESSAGE = "정보를 저장하지 못했습니다. 다시 시도해주세요.";

export default function OnboardingContent() {
  const { onboardingStep, buttonType, handleMoveNextStep, handleMoveToStep } = useOnboarding();
  const form = useFormContext<OnboardingFormValues>();
  const { data: me } = useMe();
  const [hasAgreedConsents, setHasAgreedConsents] = useState(me?.requiredConsentsAgreed ?? false);
  const step = onboardingFlow[onboardingStep];
  const StepComponent = step.component;

  const {
    mutate: submitOnboarding,
    isPending: isSubmitting,
    error,
  } = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: handleMoveNextStep,
    onError: (error) => {
      const message = getErrorMessage(error, FALLBACK_ERROR_MESSAGE);

      switch (getOnboardingErrorCode(error)) {
        case "DUPLICATE_VEHICLE":
          handleMoveToStep("CAR_NUMBER");
          form.setError("vehicleNumber", { message });
          break;
        case "DUPLICATE_PHONE":
          handleMoveToStep("PHONE_NUMBER");
          form.setError("phoneNumber", { message });
          break;
        case "REQUIRED_CONSENTS_MISSING":
          setHasAgreedConsents(false);
          break;
        case "ALREADY_COMPLETED":
          handleMoveNextStep();
          break;
      }
    },
  });
  // 에러 코드로 처리되지 않은 실패만 버튼 위에 메시지로 보여준다.
  const submitErrorMessage =
    error && getOnboardingErrorCode(error) === null
      ? getErrorMessage(error, FALLBACK_ERROR_MESSAGE)
      : null;

  const handlePrimaryAction = async () => {
    if (isSubmitting) return;

    const isValid = await form.trigger(step.fields, { shouldFocus: true });

    if (!isValid) return;

    if (buttonType === "SUBMIT") {
      submitOnboarding(form.getValues());
      return;
    }

    handleMoveNextStep();
  };

  return (
    <AnimatedOnboarding>
      <form
        className="flex flex-col w-full h-full max-w-md min-h-0 pt-2 mx-auto"
        onSubmit={(event) => {
          event.preventDefault();
          void handlePrimaryAction();
        }}
      >
        <div className="flex flex-1 min-h-0 pt-4 overflow-hidden">
          <StepComponent />
        </div>
        <div className="relative z-10 flex flex-col gap-2 pt-2 shrink-0 bg-background">
          {buttonType === "SUBMIT" && <FieldError>{submitErrorMessage}</FieldError>}
          <Button
            type="submit"
            size="lg"
            className="h-12 w-full shadow-none"
            disabled={isSubmitting}
          >
            {buttonType === "NEXT" ? "다음으로" : "시작하기"}
          </Button>
        </div>
      </form>
      <ConsentSheet open={!hasAgreedConsents} onAgreed={() => setHasAgreedConsents(true)} />
    </AnimatedOnboarding>
  );
}
