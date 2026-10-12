import { useQuery } from "@tanstack/react-query";

import { getProfile } from "@/features/mypage/apis/getProfile";

const PROFILE_QUERY_KEY = ["users", "me", "profile"] as const;

const useProfile = () =>
  useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: getProfile,
    refetchOnMount: "always",
    retry: false,
  });

export { PROFILE_QUERY_KEY, useProfile };
