import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { onAppPushReceived } from "@/features/auth/appBridge";

/** 앱 푸시(주차 완료 · 출차 응답 · 출차 완료 등)가 오면 보고 있는 화면의 데이터를 폴링을 기다리지 않고 바로 다시 받는다. */
const useRefreshOnAppPush = (enabled: boolean) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    return onAppPushReceived(() => void queryClient.invalidateQueries());
  }, [enabled, queryClient]);
};

export { useRefreshOnAppPush };
