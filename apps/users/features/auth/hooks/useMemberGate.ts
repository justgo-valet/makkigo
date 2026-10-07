import { getErrorMessage } from "@makkigo/api-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useMe } from "@/features/user/hooks/useMe";

import type { MeResponse } from "@/libs/user/contracts/me";

type MemberArea = "member" | "onboarding";

const FALLBACK_ERROR_MESSAGE = "회원 정보를 불러오지 못했습니다.";

const getRedirectPath = (area: MemberArea, me: MeResponse) => {
  const isReady = me.requiredConsentsAgreed && me.onboardingCompleted;

  if (area === "member" && !isReady) return "/onboarding";
  if (area === "onboarding" && isReady) return "/";

  return null;
};

const useMemberGate = (area: MemberArea) => {
  const router = useRouter();
  const {
    data: me,
    error,
    isError,
    isFetchedAfterMount,
    isFetching,
    refetch,
  } = useMe({
    refetchOnEveryMount: true,
  });
  // 캐시에 남은 이전 응답이 아니라 이번 진입 때 받은 응답으로만 판단한다.
  const freshMe = isFetchedAfterMount && !isError ? me : undefined;
  const redirectPath = freshMe ? getRedirectPath(area, freshMe) : null;

  useEffect(() => {
    if (redirectPath) router.replace(redirectPath);
  }, [redirectPath, router]);

  if (isError && !isFetching) {
    return {
      status: "error",
      errorMessage: getErrorMessage(error, FALLBACK_ERROR_MESSAGE),
      retry: () => void refetch(),
    } as const;
  }

  return { status: freshMe && !redirectPath ? "ready" : "loading" } as const;
};

export { useMemberGate };
export type { MemberArea };
