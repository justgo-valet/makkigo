"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { getOnboardingStatus } from "../apis/getOnboardingStatus";

import type { OnboardingStatusResponse } from "../schemas/onboarding";

const ONBOARDING_POLL_INTERVAL_MS = 5_000;

interface UseOnboardingStatusOptions {
  staffId: number;
  initialData: OnboardingStatusResponse;
}

const onboardingStatusQueryKey = (staffId: number) =>
  ["staff", staffId, "onboarding-status"] as const;

const getOnboardingPollInterval = (status: OnboardingStatusResponse | undefined) =>
  status?.role === "VALET_AGENT" && status.state !== "COMPLETE"
    ? ONBOARDING_POLL_INTERVAL_MS
    : false;

const useOnboardingStatus = ({ staffId, initialData }: UseOnboardingStatusOptions) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const navigatingRef = useRef(false);
  const query = useQuery({
    queryKey: onboardingStatusQueryKey(staffId),
    queryFn: ({ signal }) => getOnboardingStatus(signal),
    initialData,
    retry: false,
    refetchInterval: ({ state }) => getOnboardingPollInterval(state.data),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (query.data.state !== "COMPLETE" || navigatingRef.current) return;

    navigatingRef.current = true;
    void queryClient.cancelQueries({ queryKey: onboardingStatusQueryKey(staffId) });
    router.replace("/");
    router.refresh();
  }, [query.data.state, queryClient, router, staffId]);

  return query;
};

export {
  ONBOARDING_POLL_INTERVAL_MS,
  getOnboardingPollInterval,
  onboardingStatusQueryKey,
  useOnboardingStatus,
};
