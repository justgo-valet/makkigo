import { useQuery } from "@tanstack/react-query";

import { getMe } from "@/features/user/apis/getMe";

const ME_QUERY_KEY = ["me"] as const;
const ME_STALE_TIME_MS = 60 * 1000;

interface UseMeOptions {
  refetchOnEveryMount?: boolean;
}

const useMe = ({ refetchOnEveryMount = false }: UseMeOptions = {}) =>
  useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: getMe,
    staleTime: ME_STALE_TIME_MS,
    refetchOnMount: refetchOnEveryMount ? "always" : true,
    retry: false,
  });

export { ME_QUERY_KEY, useMe };
