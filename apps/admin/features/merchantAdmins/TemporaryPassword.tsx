"use client";

import { Button } from "@makkigo/ui";
import { useState } from "react";

export default function TemporaryPassword({ password }: Readonly<{ password: string }>) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-medium text-amber-800">임시 비밀번호는 지금 한 번만 보여요. 업체 관리자에게 전해 주세요.</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-base select-all">{password}</code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(password).catch(() => null);
            setCopied(true);
          }}
        >
          {copied ? "복사됨" : "복사"}
        </Button>
      </div>
      <p className="text-xs text-amber-800">첫 로그인 때 새 비밀번호로 바꾸게 됩니다.</p>
    </div>
  );
}
