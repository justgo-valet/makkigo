import { useQuery } from "@tanstack/react-query";

import { getCurrentValetSession } from "@/features/valet/apis/getCurrentValetSession";

const CURRENT_VALET_SESSION_QUERY_KEY = ["valetSessions", "current"] as const;
const REFRESH_INTERVAL_MS = 60 * 1000;

const useCurrentValetSession = () =>
  useQuery({
    queryKey: CURRENT_VALET_SESSION_QUERY_KEY,
    queryFn: getCurrentValetSession,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

export { CURRENT_VALET_SESSION_QUERY_KEY, useCurrentValetSession };
