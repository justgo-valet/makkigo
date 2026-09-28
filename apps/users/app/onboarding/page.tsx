"use client";

import { useEffect } from "react";
import { useLayout } from "@/stores/layout";
import { Card, CardContent, CardFooter } from "@makkigo/ui/components/ui/card";
import OnboardingInputForm from "./_components/OnboardingInputForm";

export default function Onboarding() {
  const setHeaderConfiguration = useLayout(state => state.setHeaderConfiguration);

  useEffect(() => {
    setHeaderConfiguration({
      showBackButton: true,
      backNavigateText: '뒤로 가기'
    });
  }, [setHeaderConfiguration]);

  return (
    <div className="w-[320px] flex flex-col justify-center mx-auto">
      <OnboardingInputForm />
      <Card>
        <CardContent></CardContent>
        <CardFooter>
          애스턴마틴
        </CardFooter>
      </Card>
    </div>
  );
}
