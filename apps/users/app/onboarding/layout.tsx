"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Suspense } from "react";
import { FormProvider, useForm } from "react-hook-form";

import MemberGate from "@/features/auth/components/MemberGate";
import { DEFAULT_FORM_VALUES } from "@/features/onboarding/onboardingFlow";
import { onboardingSchema } from "@/features/onboarding/schemas/onboarding.schema";

import type { OnboardingFormValues } from "@/features/onboarding/schemas/onboarding.schema";
import type { ReactNode } from "react";

export default function OnboardingLayout({ children }: Readonly<{ children: ReactNode }>) {
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  return (
    <MemberGate area="onboarding">
      <FormProvider {...form}>
        <Suspense fallback={null}>{children}</Suspense>
      </FormProvider>
    </MemberGate>
  );
}
