import { useQuery } from "@tanstack/react-query";

import { getCurrentSession } from "@/features/valet/apis/getCurrentSession";

const CURRENT_SESSION_QUERY_KEY = ["valet-sessions", "current"] as const;
// 요원이 바꾼 상태(주차 · 출차)를 늦어도 이 간격 안에 보여준다. 앱 푸시가 오면 기다리지 않고 바로 다시 받는다.
const CURRENT_SESSION_REFETCH_MS = 5 * 1000;

const useCurrentSession = () =>
  useQuery({
    queryKey: CURRENT_SESSION_QUERY_KEY,
    queryFn: getCurrentSession,
    refetchInterval: CURRENT_SESSION_REFETCH_MS,
    retry: false,
  });

export { CURRENT_SESSION_QUERY_KEY, useCurrentSession };
