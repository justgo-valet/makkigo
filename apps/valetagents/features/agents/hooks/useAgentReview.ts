"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reviewBoothAgents } from "../apis/reviewBoothAgents";
import { boothAgentsQueryKey } from "./useBoothAgents";

import type { BoothAgentReviewBody } from "../schemas/agents";

const REVIEW_ERROR_MESSAGE = "등록 상태를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.";

interface UseAgentReviewOptions {
  staffId: number;
  boothId: number;
  onReviewed: (body: BoothAgentReviewBody) => void;
}

const useAgentReview = ({ staffId, boothId, onReviewed }: UseAgentReviewOptions) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (body: BoothAgentReviewBody) => reviewBoothAgents(boothId, body),
    retry: false,
    onSuccess: (_result, body) => onReviewed(body),
    // 실패해도 목록을 다시 받아, 요원이 고친 내용을 관리자가 보고 다시 고르게 한다.
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: boothAgentsQueryKey(staffId, boothId) }),
  });

  return {
    review: (body: BoothAgentReviewBody) => mutation.mutate(body),
    isReviewing: mutation.isPending,
    errorMessage: mutation.error ? getErrorMessage(mutation.error, REVIEW_ERROR_MESSAGE) : null,
    resetError: mutation.reset,
  };
};

export { useAgentReview };
