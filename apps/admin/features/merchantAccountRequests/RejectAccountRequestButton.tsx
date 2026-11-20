"use client";

import { useRouter } from "next/navigation";

import ConfirmButton from "@/features/common/ConfirmButton";
import { apiClient } from "@/libs/common/apiClient";

export default function RejectAccountRequestButton({ requestId }: Readonly<{ requestId: number }>) {
  const router = useRouter();

  return (
    <ConfirmButton
      label="거절"
      title="계정 요청을 거절할까요?"
      description="거절한 요청은 다시 대기로 돌릴 수 없어요. 요청한 분에게는 따로 알려 주세요."
      confirmLabel="거절"
      onConfirm={async () => {
        await apiClient.post(`merchant-account-requests/${requestId}/reject`);
        router.refresh();
      }}
    />
  );
}
