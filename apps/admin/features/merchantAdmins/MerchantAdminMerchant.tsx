"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { Button, FieldError } from "@makkigo/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import ConfirmButton from "@/features/common/ConfirmButton";
import MerchantPicker from "@/features/common/MerchantPicker";
import { apiClient } from "@/libs/common/apiClient";

export default function MerchantAdminMerchant({
  merchantAdminId,
  merchant,
}: Readonly<{
  merchantAdminId: number;
  merchant: { id: number; name: string; address: string; deleted: boolean } | null;
}>) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const link = (merchantId: number | null) =>
    apiClient.patch(`merchant-admins/${merchantAdminId}`, { json: { merchantId } });

  return (
    <div className="flex flex-col gap-4">
      {merchant ? (
        <div className="flex items-center justify-between gap-4 rounded-md border p-4">
          <div>
            {merchant.deleted ? (
              <p className="font-medium">{merchant.name} (삭제됨)</p>
            ) : (
              <Link href={`/merchants/${merchant.id}`} className="font-medium text-primary hover:underline">
                {merchant.name}
              </Link>
            )}
            <p className="text-sm text-(--tertiary-color)">{merchant.address}</p>
          </div>
          <ConfirmButton
            label="연결 해제"
            title="업체 연결을 해제할까요?"
            description="이 계정은 티켓 관리 웹에서 업체 정보와 티켓을 볼 수 없게 됩니다."
            confirmLabel="연결 해제"
            onConfirm={async () => {
              await link(null);
              router.refresh();
            }}
          />
        </div>
      ) : (
        <p className="text-sm text-(--tertiary-color)">연결된 업체가 없어요.</p>
      )}
      {editing ? (
        <>
          <MerchantPicker
            disabled={pending}
            onSelect={async (selected) => {
              setPending(true);
              setError(null);
              try {
                await link(selected.id);
                setEditing(false);
                router.refresh();
              } catch (cause) {
                setError(getErrorMessage(cause, "업체를 연결하지 못했어요."));
              } finally {
                setPending(false);
              }
            }}
          />
          {error && <FieldError>{error}</FieldError>}
          <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setEditing(false)}>
            취소
          </Button>
        </>
      ) : (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setEditing(true)}>
          {merchant ? "다른 업체로 바꾸기" : "업체 연결"}
        </Button>
      )}
    </div>
  );
}
