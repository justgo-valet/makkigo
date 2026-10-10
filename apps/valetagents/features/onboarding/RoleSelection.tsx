"use client";

import { Button, FieldError } from "@makkigo/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ROLES = [
  { value: "VALET_AGENT", label: "발렛 요원", description: "차량 입·출차 업무를 관리합니다." },
  { value: "MERCHANT_ADMIN", label: "업체 관리자", description: "업체와 발렛 운영 정보를 관리합니다." },
] as const;

export default function RoleSelection() {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectRole = async (role: (typeof ROLES)[number]["value"]) => {
    setPending(role);
    setError(null);
    try {
      const response = await fetch("/api/v1/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) throw new Error("onboarding failed");
      router.replace("/onboarding");
      router.refresh();
    } catch {
      setError("역할을 저장하지 못했어요. 다시 시도해주세요.");
      setPending(null);
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-md flex-col justify-center gap-6">
      <div>
        <h1 className="text-2xl font-bold">어떤 업무를 하시나요?</h1>
        <p className="mt-2 text-sm text-slate-500">가입 후에는 역할을 직접 변경할 수 없습니다.</p>
      </div>
      <div className="flex flex-col gap-3">
        {ROLES.map((role) => (
          <Button
            key={role.value}
            variant="outline"
            disabled={pending !== null}
            onClick={() => selectRole(role.value)}
            className="h-auto justify-start rounded-xl p-4 text-left"
          >
            <span><strong className="block">{role.label}</strong><span className="mt-1 block text-sm font-normal text-slate-500">{role.description}</span></span>
          </Button>
        ))}
      </div>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
