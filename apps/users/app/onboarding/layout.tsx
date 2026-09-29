"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Suspense } from "react";
import { FormProvider, useForm } from "react-hook-form";

import AnimatedOnboarding from "@/components/features/onboarding/AnimatedOnboarding";
import { DEFAULT_FORM_VALUES } from "@/configs/onboarding/onboardingFlow";
import { onboardingSchema } from "@/libs/onboarding/schemas/onboarding.schema";

import type { OnboardingFormValues } from "@/libs/onboarding/schemas/onboarding.schema";
import type { ReactNode } from "react";

export default function OnboardingLayout({ children }: Readonly<{ children: ReactNode }>) {
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  return (
    <FormProvider {...form}>
      <Suspense fallback={null}>
        <AnimatedOnboarding>{children}</AnimatedOnboarding>
      </Suspense>
    </FormProvider>
  );
}
