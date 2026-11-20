"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import ConfirmButton from "@/features/common/ConfirmButton";
import { apiClient } from "@/libs/common/apiClient";

import TemporaryPassword from "./TemporaryPassword";

export default function MerchantAdminAccountActions({
  merchantAdminId,
  disabled,
}: Readonly<{ merchantAdminId: number; disabled: boolean }>) {
  const router = useRouter();
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  if (disabled) return null;

  return (
    <div className="flex flex-col gap-4">
      {temporaryPassword && <TemporaryPassword password={temporaryPassword} />}
      <div className="flex gap-2">
        <ConfirmButton
          label="비밀번호 재설정"
          title="비밀번호를 재설정할까요?"
          description="새 임시 비밀번호를 만들고 이 계정의 모든 로그인을 끊습니다. 다음 로그인 때 비밀번호를 바꾸게 됩니다."
          confirmLabel="재설정"
          onConfirm={async () => {
            const body = await apiClient
              .post(`merchant-admins/${merchantAdminId}/password-reset`)
              .json<{ temporaryPassword: string }>();
            setTemporaryPassword(body.temporaryPassword);
            router.refresh();
          }}
        />
        <ConfirmButton
          label="계정 중지"
          title="계정을 중지할까요?"
          description="이 계정은 더 이상 로그인할 수 없고, 지금 로그인된 기기도 로그아웃됩니다. 되돌릴 수 없어요."
          confirmLabel="중지"
          variant="destructive"
          onConfirm={async () => {
            await apiClient.post(`merchant-admins/${merchantAdminId}/disable`);
            router.refresh();
          }}
        />
      </div>
    </div>
  );
}
