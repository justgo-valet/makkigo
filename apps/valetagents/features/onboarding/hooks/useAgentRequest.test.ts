import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import {
  handleAgentRequestSuccess,
  isAlreadyApprovedError,
  reconcileAgentRequestCache,
  reconcileAgentRequestStatus,
  refreshStatusAfterApprovedConflict,
} from "./useAgentRequest";
import { onboardingStatusQueryKey } from "./useOnboardingStatus";

import type { AgentRequestResponse, OnboardingStatusResponse } from "../schemas/onboarding";

const booth = (id: number) => ({
  id,
  name: `부스 ${id}`,
  address: "서울시 강남구",
  addressDetail: null,
  feePolicy: null,
});

const request = (
  id: number,
  status: "REQUESTED" | "APPROVED" | "REJECTED",
  updatedAt: string,
) => ({
  id,
  status,
  booth: booth(id),
  workStartTime: "22:00",
  workEndTime: "06:00",
  createdAt: "2026-10-10T00:00:00.000Z",
  updatedAt,
});

const status = (
  requests: OnboardingStatusResponse["requests"],
  state: OnboardingStatusResponse["state"] = "AWAITING_APPROVAL",
): OnboardingStatusResponse => ({
  role: "VALET_AGENT",
  state,
  nextPath: state === "COMPLETE" ? "/" : "/onboarding",
  requests,
});

const result = (
  savedRequest: AgentRequestResponse["request"],
  outcome: AgentRequestResponse["outcome"] = "UPDATED",
): AgentRequestResponse => ({ request: savedRequest, outcome });

describe("reconcileAgentRequestStatus", () => {
  it("creates an awaiting status from the authoritative saved request", () => {
    const saved = request(1, "REQUESTED", "2026-10-11T01:00:00.000Z");

    expect(reconcileAgentRequestStatus(undefined, saved)).toEqual(status([saved]));
  });

  it("reopens the matching booth with the returned work time without removing other requests", () => {
    const rejected = request(1, "REJECTED", "2026-10-10T01:00:00.000Z");
    const other = request(2, "REQUESTED", "2026-10-10T02:00:00.000Z");
    const reopened = {
      ...rejected,
      status: "REQUESTED" as const,
      workStartTime: "20:00",
      workEndTime: "04:00",
      updatedAt: "2026-10-11T01:00:00.000Z",
    };

    expect(reconcileAgentRequestStatus(status([other, rejected]), reopened)).toEqual(
      status([reopened, other]),
    );
  });

  it("never replaces a complete, approved, or demonstrably newer cached request", () => {
    const incoming = request(1, "REQUESTED", "2026-10-11T01:00:00.000Z");
    const complete = status([request(2, "APPROVED", "2026-10-11T00:00:00.000Z")], "COMPLETE");
    const approved = status([request(1, "APPROVED", "2026-10-11T00:00:00.000Z")]);
    const newer = status([request(1, "REQUESTED", "2026-10-11T02:00:00.000Z")]);

    expect(reconcileAgentRequestStatus(complete, incoming)).toBe(complete);
    expect(reconcileAgentRequestStatus(approved, incoming)).toBe(approved);
    expect(reconcileAgentRequestStatus(newer, incoming)).toBe(newer);
  });
});

describe("agent request mutation recovery", () => {
  it("publishes the saved cache before success feedback and keeps it after a failed GET", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const key = onboardingStatusQueryKey(7);
    const saved = request(1, "REQUESTED", "2026-10-11T01:00:00.000Z");
    const invalidate = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockRejectedValue(new Error("status unavailable"));
    const onSaved = vi.fn(() => {
      expect(queryClient.getQueryData(key)).toEqual(status([saved]));
    });

    handleAgentRequestSuccess(queryClient, 7, result(saved, "CREATED"), onSaved);
    await Promise.resolve();

    expect(onSaved).toHaveBeenCalledOnce();
    expect(queryClient.getQueryData(key)).toEqual(status([saved]));
    expect(invalidate).toHaveBeenCalledTimes(2);
  });

  it("retains reconciled data when a subsequent status fetch fails", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const key = onboardingStatusQueryKey(7);
    const saved = request(1, "REQUESTED", "2026-10-11T01:00:00.000Z");
    reconcileAgentRequestCache(queryClient, 7, result(saved));

    await expect(
      queryClient.fetchQuery({
        queryKey: key,
        queryFn: () => Promise.reject(new Error("status unavailable")),
        staleTime: 0,
      }),
    ).rejects.toThrow("status unavailable");

    expect(queryClient.getQueryData(key)).toEqual(status([saved]));
  });

  it("immediately refetches status only for an ALREADY_APPROVED conflict", async () => {
    const queryClient = new QueryClient();
    const refetch = vi.spyOn(queryClient, "refetchQueries").mockRejectedValue(new Error("offline"));
    const approvedConflict = { data: { code: "ALREADY_APPROVED" } };

    expect(isAlreadyApprovedError(approvedConflict)).toBe(true);
    expect(refreshStatusAfterApprovedConflict(queryClient, 7, approvedConflict)).toBe(true);
    expect(refetch).toHaveBeenCalledWith({
      queryKey: onboardingStatusQueryKey(7),
      type: "active",
    });

    refetch.mockClear();
    expect(refreshStatusAfterApprovedConflict(queryClient, 7, { data: { code: "REQUEST_CONFLICT" } })).toBe(
      false,
    );
    expect(refetch).not.toHaveBeenCalled();
    await Promise.resolve();
  });
});
