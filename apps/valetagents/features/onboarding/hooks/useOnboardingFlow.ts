"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useOnboardingStatus } from "./useOnboardingStatus";

import type {
  AgentRequestResponse,
  AgentRequestSummary,
  BoothSearchItem,
  OnboardingStatusResponse,
  SelectedBooth,
} from "../schemas/onboarding";

type OnboardingView = "search" | "pending";

interface SelectedRequest {
  booth: SelectedBooth;
  request: AgentRequestSummary | null;
  sessionId: number;
}

interface Toast {
  id: number;
  message: string;
}

interface UseOnboardingFlowOptions {
  staffId: number;
  initialStatus: OnboardingStatusResponse;
  initialView: "search" | null;
}

const STATUS_ERROR_MESSAGE = "승인 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.";
const TOAST_DURATION_MS = 3_000;

const getSavedToastMessage = ({ outcome, request }: AgentRequestResponse) =>
  outcome === "UPDATED" ? "요청 내용을 수정했어요" : `${request.booth.name}에 요원 등록을 요청했어요`;

const getInitialView = (
  initialStatus: OnboardingStatusResponse,
  initialView: "search" | null,
): OnboardingView => {
  if (initialStatus.state === "BOOTH_REQUIRED" || initialView === "search") return "search";
  return "pending";
};

const useOnboardingFlow = ({ staffId, initialStatus, initialView }: UseOnboardingFlowOptions) => {
  const router = useRouter();
  const status = useOnboardingStatus({ staffId, initialData: initialStatus });
  const [view, setView] = useState<OnboardingView>(() => getInitialView(initialStatus, initialView));
  const [selection, setSelection] = useState<SelectedRequest | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const sessionSequenceRef = useRef(0);
  const toastSequenceRef = useRef(0);
  const requests = status.data.requests;
  const hasRequests = requests.length > 0;

  // 폴링으로 받은 최신 요청 · 요금을 고른 부스에 반영한다.
  const latestSelection = useMemo<SelectedRequest | null>(() => {
    if (!selection) return null;
    const latestRequest = requests.find((request) => request.booth.id === selection.booth.id);
    if (!latestRequest) return selection;

    return {
      ...selection,
      booth: latestRequest.booth,
      request: latestRequest,
    };
  }, [selection, requests]);

  // 토스트는 잠깐 떠 있다가 스스로 사라진다.
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const beginEditing = (booth: SelectedBooth, request: AgentRequestSummary | null) => {
    sessionSequenceRef.current += 1;
    setSelection({ booth, request, sessionId: sessionSequenceRef.current });
    setView("search");
  };

  const clearSelection = () => setSelection(null);

  return {
    showsPending: view === "pending" && hasRequests,
    hasRequests,
    requests,
    pollErrorMessage: status.isRefetchError
      ? getErrorMessage(status.error, STATUS_ERROR_MESSAGE)
      : null,
    selection: latestSelection,
    initialKeyword: selection?.booth.name ?? "",
    toast,
    editRequest: (request: AgentRequestSummary) => beginEditing(request.booth, request),
    selectSearchResult: (booth: BoothSearchItem) =>
      beginEditing(booth, booth.request ? { ...booth.request, booth } : null),
    clearSelection,
    showPending: () => {
      clearSelection();
      setView("pending");
      router.replace("/onboarding", { scroll: false });
    },
    showSearch: () => {
      clearSelection();
      setView("search");
      router.replace("/onboarding?view=search", { scroll: false });
    },
    handleSaved: (result: AgentRequestResponse) => {
      toastSequenceRef.current += 1;
      setToast({ id: toastSequenceRef.current, message: getSavedToastMessage(result) });
      router.replace("/onboarding", { scroll: false });
    },
    retryStatus: () => void status.refetch(),
  };
};

export { getInitialView, getSavedToastMessage, useOnboardingFlow };
export type { Toast };
