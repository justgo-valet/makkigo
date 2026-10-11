import { getActiveStaffIdFromAccessToken } from "@makkigo/auth";
import { Button } from "@makkigo/ui";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ACCESS_TOKEN_COOKIE } from "@/server/auth/authCookies";
import { getStaffOnboardingState } from "@/server/onboarding/getStaffOnboardingState";

export default async function NewBoothPage() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  const staffId = token ? await getActiveStaffIdFromAccessToken(token) : null;
  if (!staffId) redirect("/login");

  const onboarding = await getStaffOnboardingState(staffId);
  if (!onboarding) redirect("/login");
  if (onboarding.role !== "VALET_AGENT" || onboarding.state === "COMPLETE") {
    redirect(onboarding.nextPath);
  }

  const returnPath = onboarding.state === "AWAITING_APPROVAL" ? "/onboarding?view=search" : "/onboarding";

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col px-2 pb-[17px]">
      <div className="fixed inset-0 -z-10 bg-[#f7f9fc]" />
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h1 className="text-2xl leading-8 font-medium text-(--base-color)">
          부스 등록 기능을 준비하고 있어요
        </h1>
        <p className="mt-[9px] text-sm leading-6 text-[#717171]">
          지금은 등록된 부스를 검색해 요청할 수 있어요. 이 화면에서는 부스가 새로 등록되지
          않습니다.
        </p>
      </div>
      <Button asChild className="h-14 w-full rounded-[6px] text-lg font-medium">
        <Link href={returnPath}>온보딩으로 돌아가기</Link>
      </Button>
    </div>
  );
}
