"use client";

import { useState } from "react";

import { useAgentReview } from "./useAgentReview";
import { useBoothAgents } from "./useBoothAgents";

import type { BoothAgent, BoothAgentListResponse, BoothAgentReviewBody } from "../schemas/agents";

type ReviewStatus = BoothAgentReviewBody["status"];

interface UseAgentManagementOptions {
  staffId: number;
  boothId: number;
  initialData: BoothAgentListResponse;
}

const REVIEW_NOTICES: Record<ReviewStatus, string> = {
  APPROVED: "등록을 수락했어요",
  REJECTED: "등록을 거절했어요",
};

// 등록된 요원은 거절할 수 없고, 다시 수락할 것도 없다.
const getReviewAvailability = (selectedAgents: Pick<BoothAgent, "status">[]) => {
  const hasApproved = selectedAgents.some(({ status }) => status === "APPROVED");

  return {
    canAccept: selectedAgents.some(({ status }) => status !== "APPROVED"),
    canReject: selectedAgents.length > 0 && !hasApproved,
    rejectBlockedByApproved: hasApproved,
  };
};

const useAgentManagement = ({ staffId, boothId, initialData }: UseAgentManagementOptions) => {
  const [page, setPage] = useState(initialData.page);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const list = useBoothAgents({ staffId, boothId, page, initialData });
  const review = useAgentReview({
    staffId,
    boothId,
    onReviewed: ({ status, agents }) => {
      setSelectedIds([]);
      setNotice(`${agents.length}명의 ${REVIEW_NOTICES[status]}`);
    },
  });

  const selectedAgents = list.agents.filter(({ id }) => selectedIds.includes(id));
  const availability = getReviewAvailability(selectedAgents);

  const changeSelection = (ids: number[]) => {
    review.resetError();
    setNotice(null);
    setSelectedIds(ids);
  };

  const submit = (status: ReviewStatus) => {
    setNotice(null);
    review.review({
      status,
      agents: selectedAgents.map(({ id, updatedAt }) => ({ id, updatedAt })),
    });
  };

  return {
    agents: list.agents,
    listErrorMessage: list.errorMessage,
    retryList: () => void list.retry(),
    page,
    pages: Array.from({ length: list.totalPages }, (_, index) => index + 1),
    changePage: (nextPage: number) => {
      changeSelection([]);
      setPage(nextPage);
    },
    hasSelection: selectedAgents.length > 0,
    allSelected: list.agents.length > 0 && selectedAgents.length === list.agents.length,
    isSelected: (id: number) => selectedIds.includes(id),
    toggle: (id: number) =>
      changeSelection(
        selectedIds.includes(id) ? selectedIds.filter((selected) => selected !== id) : [...selectedIds, id],
      ),
    toggleAll: (selected: boolean) =>
      changeSelection(selected ? list.agents.map(({ id }) => id) : []),
    canAccept: availability.canAccept && !review.isReviewing,
    canReject: availability.canReject && !review.isReviewing,
    rejectBlockedByApproved: availability.rejectBlockedByApproved,
    reviewErrorMessage: review.errorMessage,
    notice,
    accept: () => submit("APPROVED"),
    reject: () => submit("REJECTED"),
  };
};

export { getReviewAvailability, useAgentManagement };
