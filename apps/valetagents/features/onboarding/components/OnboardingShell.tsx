"use client";

import ApprovalPending from "./ApprovalPending";
import BoothRequestForm from "./BoothRequestForm";
import BoothSearch from "./BoothSearch";
import OnboardingToast from "./OnboardingToast";
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
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col pt-2">
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
              kakaoMapAppKey={kakaoMapAppKey}
              canReturnToPending={flow.hasRequests}
              onShowPending={flow.showPending}
              onSaved={flow.handleSaved}
            />
          )}
        </BoothSearch>
      )}
      <OnboardingToast toast={flow.toast} />
    </div>
  );
}
