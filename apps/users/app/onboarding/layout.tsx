import { ReactNode, Suspense } from "react";

export default function OnboardingLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <Suspense fallback={null}>
      {children}
    </Suspense>
  );
}