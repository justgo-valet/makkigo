"use client";

import AppHeader from "@/components/layouts/AppHeader";

import ApprovalPending from "./ApprovalPending";
import BoothRequestForm from "./BoothRequestForm";
import BoothSearch from "./BoothSearch";
import OnboardingToast from "./OnboardingToast";
import { useOnboardingFlow } from "../hooks/useOnboardingFlow";

import type { OnboardingStatusResponse } from "../schemas/onboarding";
import type { MenuAccess } from "@/libs/auth/menuItems";

interface OnboardingShellProps {
  staffId: number;
  menu: MenuAccess;
  initialStatus: OnboardingStatusResponse;
  initialView: "search" | null;
  kakaoMapAppKey: string;
}

export default function OnboardingShell({
  staffId,
  menu,
  initialStatus,
  initialView,
  kakaoMapAppKey,
}: Readonly<OnboardingShellProps>) {
  const flow = useOnboardingFlow({ staffId, initialStatus, initialView });
  const canGoBack = !flow.showsPending && (flow.hasRequests || flow.selection !== null);

  const goBack = () => {
    if (flow.hasRequests) flow.showPending();
    else flow.clearSelection();
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
      <AppHeader menu={menu} onBack={canGoBack ? goBack : undefined} />
      <div className="mt-2 flex flex-1 flex-col">
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
                staffName={flow.staffName}
                kakaoMapAppKey={kakaoMapAppKey}
                canReturnToPending={flow.hasRequests}
                onShowPending={flow.showPending}
                onSaved={flow.handleSaved}
              />
            )}
          </BoothSearch>
        )}
      </div>
      <OnboardingToast toast={flow.toast} />
    </div>
  );
}
