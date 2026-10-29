"use client";

import { Button, FieldError } from "@makkigo/ui";

import ConsentSheet from "@/features/consent/components/ConsentSheet";
import AnimatedOnboarding from "@/features/onboarding/components/AnimatedOnboarding";
import CarBrandStep from "@/features/onboarding/components/CarBrandStep";
import CarModelStep from "@/features/onboarding/components/CarModelStep";
import CarNumberStep from "@/features/onboarding/components/CarNumberStep";
import CustomCarInputStep from "@/features/onboarding/components/CustomCarInputStep";
import PhoneNumberStep from "@/features/onboarding/components/PhoneNumberStep";
import { useOnboardingContent } from "@/features/onboarding/hooks/useOnboardingContent";

import type { OnboardingStepProps } from "@/features/onboarding/hooks/useOnboardingStep";
import type { OnboardingStep } from "@/features/onboarding/onboardingSteps";

interface StepContentProps {
  onboardingStep: OnboardingStep;
  isCustomInput: boolean;
  stepProps: OnboardingStepProps;
}

function StepContent({ onboardingStep, isCustomInput, stepProps }: Readonly<StepContentProps>) {
  if (isCustomInput && onboardingStep === "CAR_BRAND") {
    return (
      <CustomCarInputStep
        id="car-brand"
        title="제조사를 입력해주세요"
        description="목록에 없는 브랜드는 직접 적어주시면 등록해 드려요."
        placeholder="예: 코닉세그"
        requiredMessage="제조사를 입력해주세요."
        {...stepProps.carBrandInput}
      />
    );
  }

  if (isCustomInput && onboardingStep === "CAR_MODEL") {
    const { carBrand, ...inputProps } = stepProps.carModelInput;

    return (
      <CustomCarInputStep
        id="car-model"
        title="모델명을 입력해주세요"
        description={carBrand}
        placeholder="예: 아반떼"
        requiredMessage="모델명을 입력해주세요."
        {...inputProps}
      />
    );
  }

  switch (onboardingStep) {
    case "CAR_NUMBER":
      return <CarNumberStep {...stepProps.carNumber} />;
    case "PHONE_NUMBER":
      return <PhoneNumberStep {...stepProps.phoneNumber} />;
    case "CAR_BRAND":
      return <CarBrandStep {...stepProps.carBrand} />;
    case "CAR_MODEL":
      return <CarModelStep {...stepProps.carModel} />;
  }
}

export default function OnboardingContent() {
  const {
    onboardingStep,
    isCustomInput,
    stepProps,
    isSubmitStep,
    isBusy,
    submitErrorMessage,
    isConsentSheetOpen,
    handleConsentsAgreed,
    handleSubmit,
  } = useOnboardingContent();

  return (
    <AnimatedOnboarding>
      <form
        className="flex flex-col w-full h-full max-w-md min-h-0 pt-2 mx-auto"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-1 min-h-0 pt-4 overflow-hidden">
          <StepContent
            onboardingStep={onboardingStep}
            isCustomInput={isCustomInput}
            stepProps={stepProps}
          />
        </div>
        <div className="relative z-10 flex flex-col gap-2 pt-2 shrink-0 bg-background">
          {isSubmitStep && <FieldError>{submitErrorMessage}</FieldError>}
          <Button type="submit" size="lg" className="h-12 w-full shadow-none" disabled={isBusy}>
            {isSubmitStep ? "시작하기" : "다음으로"}
          </Button>
        </div>
      </form>
      <ConsentSheet open={isConsentSheetOpen} onAgreed={handleConsentsAgreed} />
    </AnimatedOnboarding>
  );
}
