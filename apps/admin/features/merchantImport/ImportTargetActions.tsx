"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { Button, FieldError } from "@makkigo/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

import ConfirmButton from "@/features/common/ConfirmButton";
import { apiClient } from "@/libs/common/apiClient";

import { useImportRun } from "./ImportRunProvider";

export default function ImportTargetActions({ targetId, targetName }: Readonly<{ targetId: number; targetName: string }>) {
  const router = useRouter();
  const { running, setRunning } = useImportRun();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={running}
          onClick={async () => {
            setPending(true);
            setRunning(true);
            setError(null);
            try {
              await apiClient.post(`merchant-import-targets/${targetId}/run`, { timeout: false });
              router.refresh();
            } catch (cause) {
              setError(getErrorMessage(cause, "수집하지 못했어요."));
            } finally {
              setPending(false);
              setRunning(false);
            }
          }}
        >
          {pending ? "수집 중…" : "지금 수집"}
        </Button>
        <ConfirmButton
          label="삭제"
          title="수집 대상을 삭제할까요?"
          description={`${targetName} 을(를) 더 이상 수집하지 않아요. 이미 가져온 업체는 업체 목록에 그대로 남아요.`}
          confirmLabel="삭제"
          onConfirm={async () => {
            await apiClient.delete(`merchant-import-targets/${targetId}`);
            router.refresh();
          }}
        />
      </div>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
