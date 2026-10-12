"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reviewBoothMerchants } from "../apis/reviewBoothMerchants";
import { boothMerchantsQueryKey } from "./useBoothMerchants";

import type { BoothMerchantReviewBody } from "../schemas/merchants";

const REVIEW_ERROR_MESSAGE = "등록 상태를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.";

interface UseMerchantReviewOptions {
  staffId: number;
  boothId: number;
  onReviewed: (body: BoothMerchantReviewBody) => void;
  onFailed: () => void;
}

const useMerchantReview = ({ staffId, boothId, onReviewed, onFailed }: UseMerchantReviewOptions) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (body: BoothMerchantReviewBody) => reviewBoothMerchants(boothId, body),
    retry: false,
    onSuccess: (_result, body) => onReviewed(body),
    onError: onFailed,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: boothMerchantsQueryKey(staffId, boothId) }),
  });

  return {
    review: (body: BoothMerchantReviewBody) => mutation.mutate(body),
    isReviewing: mutation.isPending,
    errorMessage: mutation.error ? getErrorMessage(mutation.error, REVIEW_ERROR_MESSAGE) : null,
    resetError: mutation.reset,
  };
};

export { useMerchantReview };
