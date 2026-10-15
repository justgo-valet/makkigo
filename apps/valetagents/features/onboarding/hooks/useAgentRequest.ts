"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { saveAgentRequest } from "../apis/saveAgentRequest";
import { onboardingStatusQueryKey } from "./useOnboardingStatus";

import type { QueryClient } from "@tanstack/react-query";
import type { SaveAgentRequestInput } from "../apis/saveAgentRequest";
import type { AgentRequestResponse, OnboardingStatusResponse } from "../schemas/onboarding";

const SAVE_ERROR_MESSAGE = "등록 요청을 저장하지 못했어요. 입력한 시간은 유지됩니다.";

interface UseAgentRequestOptions {
  staffId: number;
  onSaved: (result: AgentRequestResponse) => void;
}

const isNewerRequest = (
  current: OnboardingStatusResponse["requests"][number],
  incoming: AgentRequestResponse["request"],
) => Date.parse(current.updatedAt) > Date.parse(incoming.updatedAt);

const reconcileAgentRequestStatus = (
  current: OnboardingStatusResponse | undefined,
  incoming: AgentRequestResponse["request"],
): OnboardingStatusResponse => {
  if (
    current &&
    (current.state === "COMPLETE" || current.requests.some(({ status }) => status === "APPROVED"))
  ) {
    return current;
  }

  const matchingRequest = current?.requests.find(
    (request) => request.id === incoming.id || request.booth.id === incoming.booth.id,
  );
  if (
    current &&
    matchingRequest &&
    (matchingRequest.status === "APPROVED" || isNewerRequest(matchingRequest, incoming))
  ) {
    return current;
  }

  const otherRequests =
    current?.requests.filter(
      (request) => request.id !== incoming.id && request.booth.id !== incoming.booth.id,
    ) ?? [];

  return {
    role: "VALET_AGENT",
    state: "AWAITING_APPROVAL",
    nextPath: "/onboarding",
    requests: [incoming, ...otherRequests],
  };
};

const isAlreadyApprovedError = (error: unknown) => {
  if (typeof error !== "object" || error === null || !("data" in error)) return false;

  const { data } = error;
  return (
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    data.code === "ALREADY_APPROVED"
  );
};

const ignoreBackgroundFailure = (operation: Promise<unknown>) => {
  void operation.catch(() => undefined);
};

const reconcileAgentRequestCache = (
  queryClient: QueryClient,
  staffId: number,
  result: AgentRequestResponse,
) => {
  queryClient.setQueryData<OnboardingStatusResponse>(
    onboardingStatusQueryKey(staffId),
    (current) => reconcileAgentRequestStatus(current, result.request),
  );
};

const handleAgentRequestSuccess = (
  queryClient: QueryClient,
  staffId: number,
  result: AgentRequestResponse,
  onSaved: (result: AgentRequestResponse) => void,
) => {
  reconcileAgentRequestCache(queryClient, staffId, result);
  onSaved(result);
  ignoreBackgroundFailure(
    queryClient.invalidateQueries({ queryKey: onboardingStatusQueryKey(staffId) }),
  );
  ignoreBackgroundFailure(
    queryClient.invalidateQueries({ queryKey: ["staff", staffId, "booths"] }),
  );
};

const refreshStatusAfterApprovedConflict = (
  queryClient: QueryClient,
  staffId: number,
  error: unknown,
) => {
  if (!isAlreadyApprovedError(error)) return false;

  ignoreBackgroundFailure(
    queryClient.refetchQueries({ queryKey: onboardingStatusQueryKey(staffId), type: "active" }),
  );
  return true;
};

const useAgentRequest = ({ staffId, onSaved }: UseAgentRequestOptions) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: saveAgentRequest,
    retry: false,
    onMutate: () => queryClient.cancelQueries({ queryKey: onboardingStatusQueryKey(staffId) }),
    onSuccess: (result) => handleAgentRequestSuccess(queryClient, staffId, result, onSaved),
    onError: (error) => refreshStatusAfterApprovedConflict(queryClient, staffId, error),
  });

  return {
    save: (input: SaveAgentRequestInput) => mutation.mutate(input),
    isSaving: mutation.isPending,
    errorMessage: mutation.error ? getErrorMessage(mutation.error, SAVE_ERROR_MESSAGE) : null,
    resetError: mutation.reset,
  };
};

export {
  handleAgentRequestSuccess,
  isAlreadyApprovedError,
  reconcileAgentRequestCache,
  reconcileAgentRequestStatus,
  refreshStatusAfterApprovedConflict,
  useAgentRequest,
};
