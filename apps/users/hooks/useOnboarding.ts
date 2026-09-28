import { useLayout } from "@/stores/layout";
import { ONBOARDING_STEPS } from "@/configs/onboarding/onboardingSteps";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";

type OnboardingButtonType = "NEXT" | "SUBMIT";

const useOnboarding = () => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const setHeaderConfiguration = useLayout(
        state => state.setHeaderConfiguration,
    );
    const stepParameter = searchParams.get("step");
    const matchedStepIndex = ONBOARDING_STEPS.findIndex(
        onboardingStep => onboardingStep === stepParameter,
    );
    const stepIndex = matchedStepIndex >= 0 ? matchedStepIndex : 0;

    const buttonType: OnboardingButtonType =
        stepIndex === ONBOARDING_STEPS.length - 1 ? "SUBMIT" : "NEXT";

    const moveToStep = useCallback(
        (targetStepIndex: number) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("step", ONBOARDING_STEPS[targetStepIndex]);
            router.replace(`${pathname}?${params.toString()}`);
        },
        [pathname, router, searchParams],
    );

    const handleMoveNextStep = useCallback(() => {
        if (stepIndex === ONBOARDING_STEPS.length - 1) {
            router.replace("/");
            return;
        }

        const nextIndex = stepIndex + 1;
        moveToStep(nextIndex);
    }, [moveToStep, router, stepIndex]);

    const handleBack = useCallback(() => {
        if (stepIndex === 0) {
            router.back();
            return;
        }

        const previousIndex = stepIndex - 1;
        moveToStep(previousIndex);
    }, [moveToStep, router, stepIndex]);

    useEffect(() => {
        setHeaderConfiguration({
            showBackButton: true,
            backButtonHandler: handleBack,
            showRightMenu: false,
            logoPosition: "hidden",
        });
    }, [handleBack, setHeaderConfiguration]);

    useEffect(
        () => () => setHeaderConfiguration({}),
        [setHeaderConfiguration],
    );

    return {
        onboardingStep: ONBOARDING_STEPS[stepIndex],
        stepIndex,
        totalSteps: ONBOARDING_STEPS.length,
        buttonType,
        handleMoveNextStep,
        handleBack,
        isFirstStep: stepIndex === 0,
        isLastStep: stepIndex === ONBOARDING_STEPS.length - 1,
    };
};

export default useOnboarding;
