"use client";

import ApprovalPending from "./ApprovalPending";
import BoothRequestForm from "./BoothRequestForm";
import BoothSearch from "./BoothSearch";
import { useOnboardingFlow } from "../hooks/useOnboardingFlow";

import type { OnboardingStatusResponse } from "../schemas/onboarding";

interface OnboardingShellProps {
  staffId: number;
  initialStatus: OnboardingStatusResponse;
  initialView: "search" | null;
  kakaoMapAppKey: string;
}

export default function OnboardingShell({
  staffId,
  initialStatus,
  initialView,
  kakaoMapAppKey,
}: Readonly<OnboardingShellProps>) {
  const flow = useOnboardingFlow({ staffId, initialStatus, initialView });

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-2 pt-[35px] pb-[calc(17px+env(safe-area-inset-bottom))]">
      <div className="fixed inset-0 -z-10 bg-[#f7f9fc]" />
      {flow.showsPending ? (
        <ApprovalPending
          requests={flow.requests}
          pollErrorMessage={flow.pollErrorMessage}
          onEdit={flow.editRequest}
          onRequestAnother={flow.showSearch}
          onRetry={flow.retryStatus}
        />
      ) : (
        <BoothSearch
          staffId={staffId}
          initialKeyword={flow.initialKeyword}
          canReturnToPending={flow.hasRequests}
          onShowPending={flow.showPending}
          onKeywordChange={flow.clearSelection}
          onSelect={flow.selectSearchResult}
        >
          {flow.selection && (
            <BoothRequestForm
              key={flow.selection.sessionId}
              staffId={staffId}
              booth={flow.selection.booth}
              request={flow.selection.request}
              notice={flow.notice}
              kakaoMapAppKey={kakaoMapAppKey}
              canReturnToPending={flow.hasRequests}
              onShowPending={flow.showPending}
              onSaved={flow.handleSaved}
            />
          )}
        </BoothSearch>
      )}
    </div>
  );
}
