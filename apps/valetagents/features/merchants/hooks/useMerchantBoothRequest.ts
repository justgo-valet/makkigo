"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { getBoothRequestErrorCode, requestMerchantBooth } from "../apis/requestMerchantBooth";
import { useMerchantBoothField } from "./useMerchantBoothField";

import type { BoothRequestErrorCode } from "@/libs/merchant/contracts/booth-request";

const FALLBACK_ERROR_MESSAGE = "계약을 요청하지 못했어요. 다시 시도해 주세요.";
const ERROR_MESSAGES: Record<BoothRequestErrorCode, string> = {
  MERCHANT_ALREADY_APPROVED: "이미 승인된 업체예요.",
  MERCHANT_NOT_FOUND: "업체를 찾을 수 없어요.",
  BOOTH_NOT_FOUND: "부스를 찾을 수 없어요. 다시 검색해 주세요.",
  ALREADY_REQUESTED: "이미 계약을 요청한 부스예요.",
};

const getBoothRequestErrorMessage = (error: Error) => {
  const code = getBoothRequestErrorCode(error);

  return code ? ERROR_MESSAGES[code] : getErrorMessage(error, FALLBACK_ERROR_MESSAGE);
};

const useMerchantBoothRequest = (staffId: number, merchantId: number) => {
  const router = useRouter();
  const booth = useMerchantBoothField(staffId);
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const refresh = () => startRefresh(() => router.refresh());
  const { mutate, isPending, error, variables, reset } = useMutation({
    mutationFn: (boothId: number) => requestMerchantBooth(merchantId, boothId),
    onSuccess: () => {
      booth.clear();
      setIsOpen(false);
      refresh();
    },
    onError: (requestError) => {
      if (getBoothRequestErrorCode(requestError)) refresh();
    },
  });

  return {
    booth,
    isOpen,
    isRequesting: isPending,
    isRefreshing,
    errorMessage:
      error && booth.selected?.id === variables ? getBoothRequestErrorMessage(error) : null,
    open: () => {
      reset();
      setIsOpen(true);
    },
    close: () => {
      if (isPending) return;
      booth.clear();
      reset();
      setIsOpen(false);
    },
    submit: () => {
      if (!isPending && booth.selected) mutate(booth.selected.id);
    },
  };
};

export { useMerchantBoothRequest };
