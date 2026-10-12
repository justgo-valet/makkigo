"use client";

import { useState } from "react";

import { useBoothMerchants } from "./useBoothMerchants";
import { useMerchantReview } from "./useMerchantReview";

import type {
  BoothMerchant,
  BoothMerchantListResponse,
  BoothMerchantReviewBody,
} from "../schemas/merchants";

type ReviewStatus = BoothMerchantReviewBody["status"];

interface UseMerchantManagementOptions {
  staffId: number;
  boothId: number;
  initialData: BoothMerchantListResponse;
}

const REVIEW_NOTICES: Record<ReviewStatus, string> = {
  APPROVED: "계약을 수락했어요",
  REJECTED: "계약을 거절했어요",
};

// 등록된 업체는 거절할 수 없고, 다시 수락할 것도 없다.
const getReviewAvailability = (selectedMerchants: Pick<BoothMerchant, "status">[]) => {
  const hasApproved = selectedMerchants.some(({ status }) => status === "APPROVED");

  return {
    canAccept: selectedMerchants.some(({ status }) => status !== "APPROVED"),
    canReject: selectedMerchants.length > 0 && !hasApproved,
    rejectBlockedByApproved: hasApproved,
  };
};

// 상세는 눌러서 고른 행 하나로만 정해진다. 체크박스 선택과는 상관없다.
const getDetail = <Merchant extends Pick<BoothMerchant, "id">>(
  merchants: Merchant[],
  detailId: number | null,
) => merchants.find(({ id }) => id === detailId) ?? null;

// 체크한 업체 가운데 지금 보이는 쪽에 있는 것만 수락 · 거절 대상이다.
const getSelectedMerchants = <Merchant extends Pick<BoothMerchant, "id">>(
  merchants: Merchant[],
  selectedIds: number[],
) => merchants.filter(({ id }) => selectedIds.includes(id));

const useMerchantManagement = ({ staffId, boothId, initialData }: UseMerchantManagementOptions) => {
  const [page, setPage] = useState(initialData.page);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const list = useBoothMerchants({ staffId, boothId, page, initialData });
  const review = useMerchantReview({
    staffId,
    boothId,
    onReviewed: ({ status, merchants }) => {
      setSelectedIds([]);
      setNotice(`${merchants.length}곳의 ${REVIEW_NOTICES[status]}`);
    },
    onFailed: () => setSelectedIds([]),
  });

  const selectedMerchants = getSelectedMerchants(list.merchants, selectedIds);
  const availability = getReviewAvailability(selectedMerchants);

  const changeSelection = (ids: number[]) => {
    review.resetError();
    setNotice(null);
    setSelectedIds(ids);
  };

  const submit = (status: ReviewStatus) => {
    setNotice(null);
    review.review({
      status,
      merchants: selectedMerchants.map(({ id, updatedAt }) => ({ id, updatedAt })),
    });
  };

  return {
    merchants: list.merchants,
    listErrorMessage: list.errorMessage,
    retryList: () => void list.retry(),
    page,
    pages: Array.from({ length: list.totalPages }, (_, index) => index + 1),
    changePage: (nextPage: number) => {
      changeSelection([]);
      setDetailId(null);
      setPage(nextPage);
    },
    detail: getDetail(list.merchants, detailId),
    showDetail: setDetailId,
    allSelected: list.merchants.length > 0 && selectedMerchants.length === list.merchants.length,
    isSelected: (id: number) => selectedIds.includes(id),
    toggle: (id: number) =>
      changeSelection(
        selectedIds.includes(id) ? selectedIds.filter((selected) => selected !== id) : [...selectedIds, id],
      ),
    toggleAll: (selected: boolean) =>
      changeSelection(selected ? list.merchants.map(({ id }) => id) : []),
    canAccept: availability.canAccept && !review.isReviewing,
    canReject: availability.canReject && !review.isReviewing,
    rejectBlockedByApproved: availability.rejectBlockedByApproved,
    reviewErrorMessage: review.errorMessage,
    notice,
    accept: () => submit("APPROVED"),
    reject: () => submit("REJECTED"),
  };
};

export { getDetail, getReviewAvailability, getSelectedMerchants, useMerchantManagement };
