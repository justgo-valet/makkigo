import { Card, CardContent, CardFooter } from "@makkigo/ui/components/ui/card";
import OnboardingInputForm from "./_components/OnboardingInputForm";

export default function Onboarding() {
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
