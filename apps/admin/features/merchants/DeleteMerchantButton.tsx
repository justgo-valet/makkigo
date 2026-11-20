"use client";

import { useRouter } from "next/navigation";

import ConfirmButton from "@/features/common/ConfirmButton";
import { apiClient } from "@/libs/common/apiClient";

export default function DeleteMerchantButton({ merchantId, merchantName }: Readonly<{ merchantId: number; merchantName: string }>) {
  const router = useRouter();

  return (
    <ConfirmButton
      label="업체 삭제"
      title="업체를 삭제할까요?"
      description={`${merchantName} 을(를) 목록에서 지웁니다. 고객 앱 검색과 QR 에서도 더 이상 보이지 않아요.`}
      confirmLabel="삭제"
      variant="destructive"
      onConfirm={async () => {
        await apiClient.delete(`merchants/${merchantId}`);
        router.replace("/merchants");
        router.refresh();
      }}
    />
  );
}
