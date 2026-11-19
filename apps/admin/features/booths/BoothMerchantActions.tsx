"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { Button } from "@makkigo/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

import ConfirmButton from "@/features/common/ConfirmButton";
import { apiClient } from "@/libs/common/apiClient";

import type { BoothMerchantStatus } from "database";

export default function BoothMerchantActions({
  boothId,
  merchantId,
  merchantName,
  status,
}: Readonly<{ boothId: number; merchantId: number; merchantName: string; status: BoothMerchantStatus }>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const path = `booths/${boothId}/merchants/${merchantId}`;

  if (status === "REJECTED") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            await apiClient.put(path);
            router.refresh();
          } catch (cause) {
            window.alert(getErrorMessage(cause, "연결 요청을 보내지 못했어요."));
          } finally {
            setPending(false);
          }
        }}
      >
        다시 요청
      </Button>
    );
  }

  return (
    <ConfirmButton
      label={status === "PENDING" ? "요청 취소" : "연결 해제"}
      title={status === "PENDING" ? "연결 요청을 취소할까요?" : "연결을 해제할까요?"}
      description={
        status === "PENDING"
          ? `${merchantName} 연결 요청을 취소합니다.`
          : `${merchantName} 과(와) 이 부스의 연결을 해제합니다. 이 부스 요원은 더 이상 이 업체 고객을 받지 않습니다.`
      }
      confirmLabel={status === "PENDING" ? "요청 취소" : "연결 해제"}
      onConfirm={async () => {
        await apiClient.delete(path);
        router.refresh();
      }}
    />
  );
}
