import { useQuery } from "@tanstack/react-query";

import { getCurrentSession } from "@/features/valet/apis/getCurrentSession";

const CURRENT_SESSION_QUERY_KEY = ["valet-sessions", "current"] as const;
const CURRENT_SESSION_REFETCH_MS = 30 * 1000;

const useCurrentSession = () =>
  useQuery({
    queryKey: CURRENT_SESSION_QUERY_KEY,
    queryFn: getCurrentSession,
    refetchInterval: CURRENT_SESSION_REFETCH_MS,
    retry: false,
  });

export { CURRENT_SESSION_QUERY_KEY, useCurrentSession };
