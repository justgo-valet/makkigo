"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import ApprovalPending from "./ApprovalPending";
import BoothRequestForm from "./BoothRequestForm";
import BoothSearch from "./BoothSearch";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus";

import type {
  AgentRequestResponse,
  AgentRequestSummary,
  BoothSearchItem,
  OnboardingStatusResponse,
  SelectedBooth,
} from "../schemas/onboarding";

type ShellView = "search" | "pending";

interface SelectedRequest {
  booth: SelectedBooth;
  request: AgentRequestSummary | null;
  sessionId: number;
}

interface OnboardingShellProps {
  staffId: number;
  initialStatus: OnboardingStatusResponse;
  initialView: "search" | null;
  kakaoMapAppKey: string;
}

const STATUS_ERROR_MESSAGE = "승인 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.";
const UPDATED_NOTICE = "요청 내용을 수정했어요";

const getInitialView = (
  initialStatus: OnboardingStatusResponse,
  initialView: "search" | null,
): ShellView => {
  if (initialStatus.state === "BOOTH_REQUIRED" || initialView === "search") return "search";
  return "pending";
};

export default function OnboardingShell({
  staffId,
  initialStatus,
  initialView,
  kakaoMapAppKey,
}: Readonly<OnboardingShellProps>) {
  const router = useRouter();
  const status = useOnboardingStatus({ staffId, initialData: initialStatus });
  const [view, setView] = useState<ShellView>(() => getInitialView(initialStatus, initialView));
  const [selection, setSelection] = useState<SelectedRequest | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const sessionSequenceRef = useRef(0);
  const hasRequests = status.data.requests.length > 0;
  const showsPending = view === "pending" && hasRequests;

  const latestSelection = useMemo<SelectedRequest | null>(() => {
    if (!selection) return null;
    const latestRequest = status.data.requests.find(
      (request) => request.booth.id === selection.booth.id,
    );
    if (!latestRequest) return selection;

    return {
      ...selection,
      booth: latestRequest.booth,
      request: latestRequest,
    };
  }, [selection, status.data.requests]);

  const beginEditing = (booth: SelectedBooth, request: AgentRequestSummary | null) => {
    setNotice(null);
    sessionSequenceRef.current += 1;
    setSelection({ booth, request, sessionId: sessionSequenceRef.current });
    setView("search");
  };

  const selectSearchResult = (booth: BoothSearchItem) => {
    const request = booth.request ? { ...booth.request, booth } : null;
    beginEditing(booth, request);
  };

  const clearSelection = () => {
    setSelection(null);
    setNotice(null);
  };

  const showPending = () => {
    clearSelection();
    setView("pending");
    router.replace("/onboarding", { scroll: false });
  };

  const showSearch = () => {
    clearSelection();
    setView("search");
    router.replace("/onboarding?view=search", { scroll: false });
  };

  const handleSaved = (result: AgentRequestResponse) => {
    setNotice(result.outcome === "UPDATED" ? UPDATED_NOTICE : null);
    router.replace("/onboarding", { scroll: false });
  };

  const pollErrorMessage = status.isRefetchError
    ? getErrorMessage(status.error, STATUS_ERROR_MESSAGE)
    : null;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-2 pt-[35px] pb-[calc(17px+env(safe-area-inset-bottom))]">
      <div className="fixed inset-0 -z-10 bg-[#f7f9fc]" />
      {showsPending ? (
        <ApprovalPending
          requests={status.data.requests}
          pollErrorMessage={pollErrorMessage}
          onEdit={(request) => beginEditing(request.booth, request)}
          onRequestAnother={showSearch}
          onRetry={() => void status.refetch()}
        />
      ) : (
        <BoothSearch
          staffId={staffId}
          initialKeyword={selection?.booth.name ?? ""}
          canReturnToPending={hasRequests}
          onShowPending={showPending}
          onKeywordChange={clearSelection}
          onSelect={selectSearchResult}
        >
          {latestSelection && (
            <BoothRequestForm
              key={latestSelection.sessionId}
              staffId={staffId}
              booth={latestSelection.booth}
              request={latestSelection.request}
              notice={notice}
              kakaoMapAppKey={kakaoMapAppKey}
              canReturnToPending={hasRequests}
              onShowPending={showPending}
              onSaved={handleSaved}
            />
          )}
        </BoothSearch>
      )}
    </div>
  );
}
