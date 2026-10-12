import { getErrorMessage } from "@makkigo/api-client";
import { useQuery } from "@tanstack/react-query";

import { getMerchantDetail } from "@/features/merchant/apis/getMerchantDetail";

const FALLBACK_ERROR_MESSAGE = "업체 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";

const useMerchantDetail = (merchantId: number) => {
  const { data, error, status, refetch } = useQuery({
    queryKey: ["merchant", merchantId],
    queryFn: () => getMerchantDetail(merchantId),
    retry: false,
  });

  return {
    status,
    merchant: data ?? null,
    errorMessage: error ? getErrorMessage(error, FALLBACK_ERROR_MESSAGE) : null,
    retry: () => void refetch(),
  };
};

export { useMerchantDetail };
