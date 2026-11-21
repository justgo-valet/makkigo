import { getErrorMessage } from "@makkigo/api-client";
import { skipToken, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { getMerchantDetail } from "@/features/merchant/apis/getMerchantDetail";

import type { Merchant } from "@/libs/merchant/contracts/merchants";

const FALLBACK_ERROR_MESSAGE = "업체 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";

const useMerchantDetail = (merchantId: number | null) => {
  const { data, error, status, refetch } = useQuery({
    queryKey: ["merchant", merchantId],
    queryFn: merchantId === null ? skipToken : () => getMerchantDetail(merchantId),
    retry: false,
  });
  const [isNoBoothNoticeVisible, setIsNoBoothNoticeVisible] = useState(false);

  const choose = (onChoose: (merchant: Merchant) => void) => {
    if (!data) return;
    if (data.booths.length === 0) {
      setIsNoBoothNoticeVisible(true);
      return;
    }
    onChoose({ id: data.id, name: data.name, address: data.address });
  };

  return {
    status,
    merchant: data ?? null,
    isNoBoothNoticeVisible,
    choose,
    errorMessage: error ? getErrorMessage(error, FALLBACK_ERROR_MESSAGE) : null,
    retry: () => void refetch(),
  };
};

export { useMerchantDetail };
